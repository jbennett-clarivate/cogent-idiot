export interface ToolInfo {
	summary: string;
	fields?: Record<string, string>;
}

export const TOOL_INFO: Record<string, ToolInfo> = {
	"/tools/bayes": {
		summary:
			"Updates a probability after new evidence using Bayes' theorem. Enter how likely something is to be true to begin with and how reliable your test is, and it calculates the revised probability that it's actually true given a positive result. Handy for medical-test and false-positive style questions. Reuse the answer as the next starting point to chain several updates together.",
		fields: {
			prior: "Before any test, out of 100 similar cases, how many are actually true? Example: if a condition affects 1 in 100 people, enter 1.",
			truePositive:
				"When the thing IS true, how often does the test correctly say positive? Enter 90 to mean: of 100 true cases, 90 test positive and 10 are missed. This describes the test's behaviour on true cases only.",
			notTrue:
				"The flip side of the Prior belief, filled in automatically. If 1% of cases are true, then 99% are not. Prior belief and this always add up to 100%.",
			falsePositive:
				"When the thing is NOT true, how often does the test WRONGLY say positive? This is separate from the true-positive rate. A test can be 99% right on true cases and still wrongly flag 99% of false cases \u00b7 its accuracy on one group tells you nothing about the other. Enter 5 to mean: of 100 cases that aren't true, 5 still test positive.",
			updated:
				"After seeing a positive result, this is the corrected chance the thing is really true. It is often far lower than the test's accuracy suggests, because rare things produce many false positives.",
		},
	},
	"/tools/exit": {
		summary:
			"An exit-intent demonstration: when your cursor leaves the top of the window \u00b7 the gesture people make when they're about to close a tab or reach for the address bar \u00b7 a popup appears. It fires only once per visit so it never becomes a nuisance.",
		fields: {
			whatIsThis:
				"This popup appeared because your mouse moved past the top edge of the page, which usually signals you're about to leave. Sites often use this moment to show a reminder or offer. It only triggers once per visit, and clicking anywhere outside the box (or the button) dismisses it.",
		},
	},
	"/tools/comparator": {
		summary:
			"Compares two lists and shows you four results at once: entries only in list A, entries only in list B, the overlap they share, and the two lists combined. Paste them or upload text, CSV, or TSV files, choose case-sensitive and/or optionally enable Dedupe to remove duplicate entries within each list before comparing (fill only one side to use it as a silent list cleaner). Then export the results as CSV or TXT.",
		fields: {
			fileUpload: "Upload a list from a file instead of pasting it. Accepts plain text, CSV, and TSV files only.",
			caseSensitive:
				'When on, entries are compared exactly as typed, so "Apple" and "apple" count as different. When off, differences in capitalization are ignored.',
			dedupe: "Removes duplicate entries within each list before comparing. Fill only one side to use this as a silent list cleaner.",
			uniqueToA: "A \u2216 B \u00b7 entries that appear in List A but not in List B.",
			uniqueToB: "B \u2216 A \u00b7 entries that appear in List B but not in List A.",
			intersection: "A \u2229 B \u00b7 entries that appear in both List A and List B.",
			union: "A \u222A B \u00b7 every unique entry that appears in List A or List B.",
		},
	},
	"/tools/random": {
		summary:
			"Generates random strings to your spec. Choose how many and how long, then tick which character types to allow: lowercase, uppercase, numbers, special characters, and UTF-8. It produces one column where each type may appear and another where every chosen type is guaranteed to appear in each string. Good for passwords, test fixtures, and sample tokens.",
		fields: {
			lowercase: "Allows lowercase letters (a\u2013z) in the generated strings.",
			uppercase: "Allows uppercase letters (A\u2013Z) in the generated strings.",
			numbers: "Allows digits (0\u20139) in the generated strings.",
			special:
				"Allows special characters such as punctuation and symbols (for example ! @ # $ % &) in the generated strings.",
			utf8: "Allows a random selection of UTF-8 characters drawn from wider Unicode ranges, useful for stress-testing how systems handle non-ASCII text.",
		},
	},
	"/tools/safecron": {
		summary:
			"Finds the best meeting and downtime windows across multiple time zones. Add each zone your team works in and give it an importance weight, then it overlaps everyone's 9-to-5 working hours on a chart (relative to your local time) and suggests the hour that suits the most people for a meeting and the quietest hour for maintenance or downtime.",
	},
	"/tools/taxes": {
		summary:
			"This tool visualizes a proposed tax system where your tax rate is decided entirely by how your income compares to the poverty line. There are no brackets. The only two numbers needed to draw the whole tax curve are the poverty line from a fixed reference year and today's poverty line. Change those two numbers and watch the curve redraw.",
		fields: {
			baseline:
				"The federal poverty line for a single adult in the year this system was adopted. This number acts as a permanent anchor: once set it does not change, and it defines what the tax curve looks like under normal conditions.",
			current:
				"The federal poverty line for a single adult today. This is the number that changes the shape of the curve. When it is higher than the baseline, high earners pay more; when it is lower, they receive relief.",
			steepness:
				"How sharply the tax rate climbs with income. The formula was written with this fixed at 1.5, but that curve raises about double what the current system collects, and only by charging the top 1% an effective rate near 85%. So it is solved instead: the tool finds the steepness that raises the revenue target, which lands far shallower. It still scales with today's poverty line divided by the baseline, so raising today's line steepens the curve. At or below 1.00 take-home pay never stops rising, which is where a funded curve sits.",
			peakIncome:
				"The income at which you keep the most money after tax. Because the rate keeps climbing with income, earning more past this point hands over more than it adds. When the curve is shallow enough (steepness at or below 1.00) there is no such turning point and take-home simply keeps rising past the edge of the chart.",
			peakTaxRate:
				"The proposed tax rate you would pay at the peak take-home income. It is the rate at the best-value point on the curve, not the highest rate the curve reaches.",
			middleAnchor:
				"Twenty times today's poverty line. The curve is built so that this income is always taxed at exactly 10%, whatever the two poverty lines are \u00b7 it is the fixed point the whole curve pivots around. The anchor sits here rather than at ten times because that is what lets a revenue-neutral curve still be steep enough to produce an income ceiling.",
			revenue:
				"The curve sets a rate for every income, but it says nothing about how many people earn each income \u00b7 and that is what decides whether a tax system funds anything. US filers are concentrated below $100,000, so cutting their rate costs far more than a higher rate on the thin top tail can recover. Two things to keep in mind about the figure shown. First, it is a static estimate: it applies the proposed rates to the incomes people actually reported under today's rates, and assumes nobody changes behaviour. Second, and more important here, the system is predicated on an annual forced realisation \u00b7 a mandatory sale of about 1% of holdings each year, taxed as ordinary income. At the top, pay is largely unrealised equity, which is not income at all, so without that forced sale an income ceiling applies to a base that barely reaches the wealth it is aimed at. The panel also shows what the curve would raise if the top band simply reported the ceiling instead of what it reports today, which is the pessimistic end of the range.",
			revenueTarget:
				"The total individual income tax the curve should raise, in billions of dollars. It starts at roughly what the IRS collected in 2022 ($2.14T). Change it to a newer year's total \u2014 or to any figure you want to test \u2014 and Calibrate solves for the steepness that reaches it. The filer counts and incomes stay 2022's, so a target from a much later year is an approximation: incomes will have grown too, which means the curve is asked to raise newer dollars from older incomes and the steepness it picks is a little high.",
			ceiling:
				"The maximum income this system allows, and the reason it is built this way. Past this point the rate has climbed enough that each extra dollar earned leaves you with less than you had \u00b7 so no one has a reason to earn beyond it. It is not a legal cap; it falls out of the curve. Because every term scales with the poverty line, the ceiling does too: raise the poverty line and the ceiling rises with it. The tax rate at the ceiling is exactly 100 divided by the curve steepness, and nothing else \u00b7 not the anchor, not the poverty line. So a steepness of 1.50 puts the ceiling at a 66.7% rate, 1.22 puts it at 82.2%, and a steepness approaching 1.00 pushes it toward 100%. Note the rate keeps climbing past the ceiling: the ceiling is where take-home turns over, not where the rate stops.",
			userIncome:
				"Optional. Move the slider or type a yearly income to mark it on the chart. The black dot shows where that income sits on the proposed tax-rate line, and the readouts below give the rate, the tax paid, and what is left.",
		},
	},
	"/tools/pwned": {
		summary:
			"Checks whether a password has appeared in a known data breach. Type a password and press the Right Arrow key (or the Check button) to see a green check if it's safe or a red mark if it's been exposed. It uses k-anonymity: only the first five characters of the password's SHA-1 hash are sent to the breach database, so the password itself never leaves your browser.",
	},
	"/tools/ice": {
		summary:
			"Renders a design as a translucent 3D ice sculpture in your browser using WebGL. Drag to rotate, scroll to zoom, and tune the ice: thickness, frost, and tint. A physically based transmission material with refraction and clearcoat gives it that carved-from-glacier look.",
	},
};
