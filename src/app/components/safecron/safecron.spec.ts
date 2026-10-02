import { TestBed } from "@angular/core/testing";
import { SafecronComponent } from "./safecron";

// These tests encode the INTENT stated in src/app/config/tool-info.ts for
// /tools/safecron:
//
//   "Add each zone your team works in and give it an importance weight, then
//    it overlaps everyone's 9-to-5 working hours on a chart (relative to your
//    local time) and suggests the hour that suits the most people for a
//    meeting and the quietest hour for maintenance or downtime."
//
// Four obligations fall out of that sentence, and each describe() below pins
// one of them:
//   1. a zone's band is its own 9am-5pm, re-expressed in the viewer's slots;
//   2. slot weight is the total importance of everyone working at that slot;
//   3. the meeting suggestion is the hour of maximum total weight;
//   4. the downtime suggestion is the QUIETEST hour -- minimum total weight.
//
// Tests reach private members through `as any` on purpose. The logic under
// test is pure and deterministic; the alternative is driving it through the
// canvas, which tests rendering rather than intent.

describe("SafecronComponent", () => {
	let component: SafecronComponent;

	// A fake zone row, bypassing the dropdown so tests don't depend on the
	// machine's real UTC offsets (see .github/code-review.instructions.md:
	// "A test that passes only in America/Denver is a broken test").
	function zone(code: string, iana: string, weight: number) {
		return { iana, code, city: code, weight, color: "#808080" };
	}

	// Pin the viewer's local offset so slot math is reproducible everywhere.
	function withLocalOffset(hours: number) {
		(component as any).getLocalOffsetHours = () => hours;
	}

	// Pin each zone's UTC offset, keyed by IANA name.
	function withZoneOffsets(map: Record<string, number>) {
		(component as any).offsetHoursFor = (iana: string) => map[iana];
	}

	function slotsOf(label: string): number {
		// "9:00 AM ..." -> 36
		const m = /^(\d+):(\d\d) (AM|PM)/.exec(label);
		if (!m) throw new Error(`unparseable time label: ${label}`);
		let h = parseInt(m[1], 10) % 12;
		if (m[3] === "PM") h += 12;
		return h * 4 + parseInt(m[2], 10) / 15;
	}

	beforeEach(() => {
		TestBed.configureTestingModule({ imports: [SafecronComponent] });
		component = TestBed.createComponent(SafecronComponent).componentInstance;
	});

	describe("obligation 1: a zone's band is its own 9-to-5 in the viewer's slots", () => {
		it("puts a zone sharing the viewer's offset at 9:00am-5:00pm", () => {
			withZoneOffsets({ "X": 0 });
			const w = (component as any).computeZoneSlots(zone("X", "X", 1), 0);
			expect(w.start).toBe(36); // 9am
			expect(w.end).toBe(68); // 5pm
		});

		it("shifts a zone ahead of the viewer earlier in the viewer's day", () => {
			withZoneOffsets({ "TOKYO": 9 });
			// Tokyo 9am is 0:00 for a UTC viewer.
			const w = (component as any).computeZoneSlots(zone("TOKYO", "TOKYO", 1), 0);
			expect(w.start).toBe(0);
			expect(w.end).toBe(32);
		});

		it("keeps the band exactly eight hours wide for half-hour zones", () => {
			withZoneOffsets({ "MUMBAI": 5.5 });
			const w = (component as any).computeZoneSlots(zone("MUMBAI", "MUMBAI", 1), 0);
			expect(((w.end - w.start) + 96) % 96).toBe(32);
		});

		it("keeps the band exactly eight hours wide for quarter-hour zones", () => {
			withZoneOffsets({ "CHATHAM": 12.75 });
			const w = (component as any).computeZoneSlots(zone("CHATHAM", "CHATHAM", 1), 0);
			expect(((w.end - w.start) + 96) % 96).toBe(32);
		});
	});

	describe("obligation 2: a slot's value is the total weight working then", () => {
		it("stacks overlapping zones' weights additively", () => {
			withLocalOffset(0);
			withZoneOffsets({ "A": 0, "B": 0 });
			component.selectedLocalTimes.set([zone("A", "A", 1), zone("B", "B", 2)]);
			component.computeSafeTime();
			const arr = component.safeScheduleArray();
			expect(arr[36]).toBe(3); // both working at 9am
			expect(arr[35]).toBe(0); // nobody at 8:45am
		});

		it("leaves slots at zero when nobody is working", () => {
			withLocalOffset(0);
			withZoneOffsets({ "A": 0 });
			component.selectedLocalTimes.set([zone("A", "A", 1)]);
			component.computeSafeTime();
			expect(component.safeScheduleArray()[0]).toBe(0); // midnight
		});
	});

	describe("obligation 3: meeting is the hour of maximum total weight", () => {
		it("picks the hour inside the only zone's working window", () => {
			withLocalOffset(0);
			withZoneOffsets({ "A": 0 });
			component.selectedLocalTimes.set([zone("A", "A", 1)]);
			component.computeSafeTime();
			const s = slotsOf(component.meetingTime());
			expect(s).toBeGreaterThanOrEqual(36);
			expect(s).toBeLessThanOrEqual(64); // a 1h window must fit inside 9-5
		});

		it("favours the heaviest zone when two zones do not overlap", () => {
			withLocalOffset(0);
			// A works 9am-5pm viewer-time; B is 12h away, working 9pm-5am.
			withZoneOffsets({ "A": 0, "B": 12 });
			component.selectedLocalTimes.set([zone("A", "A", 1), zone("B", "B", 3)]);
			component.computeSafeTime();
			const s = slotsOf(component.meetingTime());
			// B is the heavy zone: its band is slots 84..115%96 => 84..96,0..19
			const inB = s >= 84 || s <= 16;
			expect(inB).toBe(true);
		});
	});

	describe("obligation 4: downtime is the QUIETEST hour", () => {
		it("never suggests an hour when someone is working", () => {
			withLocalOffset(0);
			withZoneOffsets({ "A": 0 });
			component.selectedLocalTimes.set([zone("A", "A", 1)]);
			component.computeSafeTime();
			const s = slotsOf(component.downtime());
			const arr = component.safeScheduleArray();
			// The whole suggested hour must be idle.
			for (let k = 0; k < 4; k++) {
				expect(arr[(s + k) % 96]).toBe(0);
			}
		});

		// tieBreakDowntime is Math.min(...candidates), which reads like "always
		// picks midnight". It is not: the minimum is taken over minimum-SUM
		// candidates only, so a busy midnight is never a candidate. Pinned
		// because the correctness of this function is non-obvious from its body.
		it("avoids midnight when a zone is actually working at midnight", () => {
			withLocalOffset(0);
			// Offset +9 puts this zone's 9-to-5 at 12:00am-8:00am viewer-time,
			// so slot 0 is busy and must not be chosen.
			withZoneOffsets({ "A": 9 });
			component.selectedLocalTimes.set([zone("A", "A", 1)]);
			component.computeSafeTime();
			const s = slotsOf(component.downtime());
			expect(s).not.toBe(0);
			const arr = component.safeScheduleArray();
			for (let k = 0; k < 4; k++) {
				expect(arr[(s + k) % 96]).toBe(0);
			}
		});
	});

	describe("obligation 3+4: suggestions describe the CURRENT set of zones", () => {
		it("does not keep showing a stale suggestion after a zone is added", () => {
			withLocalOffset(0);
			withZoneOffsets({ "A": 0, "B": 12 });

			// User adds one zone and asks for the best time.
			component.selectedLocalTimes.set([zone("A", "A", 1)]);
			component.computeSafeTime();
			const firstAnswer = component.meetingTime();
			expect(firstAnswer).not.toBe("");

			// User then adds a second, heavier zone on the other side of the world.
			// The chart redraws via the constructor effect. The displayed
			// suggestion must not still be the single-zone answer.
			component.selectedLocalTimes.update(t => [...t, zone("B", "B", 3)]);

			// The chart redraws via the constructor effect, so the canvas now
			// shows two zones. The suggestion must either recompute or clear
			// itself; silently keeping the one-zone answer beside a two-zone
			// chart was the defect (it displayed "9:00 AM" when the current
			// zones implied "9:00 PM" -- wrong by 12 hours, with no cue).
			const shown = component.displayedMeetingTime();
			if (shown === "") return; // retracted: acceptable
			component.computeSafeTime();
			expect(shown).toBe(component.displayedMeetingTime());
		});

		it("clears a suggestion when an existing zone's weight changes", () => {
			withLocalOffset(0);
			withZoneOffsets({ "A": 0, "B": 12 });
			component.selectedLocalTimes.set([zone("A", "A", 1), zone("B", "B", 1)]);
			component.computeSafeTime();
			expect(component.displayedMeetingTime()).not.toBe("");

			// Re-adding a zone bumps its weight in place, which changes the
			// answer without changing the array length.
			component.selectedLocalTimes.update(t => [
				{ ...t[0], weight: t[0].weight + 3 },
				t[1],
			]);
			expect(component.isScheduleStale()).toBe(true);
			expect(component.displayedMeetingTime()).toBe("");
			expect(component.displayedDowntime()).toBe("");
		});
	});

	describe("zone labels track the current UTC offset", () => {
		it("agrees between the <option> label and its tooltip", () => {
			for (const opt of component.timeZones()) {
				expect(opt.label).toBe(component.getTooltipText(opt.value));
			}
		});

		// timeZones() is a computed() whose labels embed each zone's UTC offset
		// and tz abbreviation as of `new Date()`. When `timeZoneData` was a
		// plain array the computed had zero dependencies, so it evaluated once
		// and cached those labels for the tab's lifetime: a tab left open
		// across a DST transition showed a frozen label
		// ("London (UTC+1:00, GMT+1)") beside a live tooltip
		// ("London (UTC+0:00, GMT)") for the same zone, simultaneously.
		// `labelEpoch` now gives it a real dependency to invalidate on.
		it("re-derives labels when the label epoch advances", () => {
			const first = component.timeZones();
			expect(first.length).toBeGreaterThan(0);

			let describeCalls = 0;
			const original = (component as any).describeZone.bind(component);
			(component as any).describeZone = (z: unknown, at?: Date) => {
				describeCalls++;
				return original(z, at);
			};

			// Cached: no re-derivation while nothing has changed.
			component.timeZones();
			expect(describeCalls).toBe(0);

			// An epoch bump (hourly timer, or a DST change) must invalidate it.
			(component as any).labelEpoch.update((n: number) => n + 1);
			component.timeZones();
			expect(describeCalls).toBe(first.length);
		});
	});
});
