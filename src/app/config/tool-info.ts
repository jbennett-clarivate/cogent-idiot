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
				"How sharply the tax rate climbs with income, calculated as 1.5 × today's line ÷ the baseline. 1.50 is neutral · the value when today's poverty line still equals the baseline. Above 1.50 the curve bites harder at high incomes; at or below 1.00 take-home pay never stops rising.",
			peakIncome:
				"The income at which you keep the most money after tax. Because the rate keeps climbing with income, earning more past this point hands over more than it adds. When the curve is shallow enough (steepness at or below 1.00) there is no such turning point and take-home simply keeps rising past the edge of the chart.",
			peakTaxRate:
				"The proposed tax rate you would pay at the peak take-home income. It is the rate at the best-value point on the curve, not the highest rate the curve reaches.",
			middleAnchor:
				"Ten times today's poverty line. The curve is built so that this income is always taxed at exactly 10%, whatever the two poverty lines are · it is the fixed point the whole curve pivots around.",
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
