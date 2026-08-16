/**
 * Single source of truth for all explanatory copy, per tool.
 *
 * - `summary`  : tool-level description shown by the top-right info button
 *                (the "big i") in the toolbar.
 * - `fields`   : field-level help shown by the small info markers (the
 *                "little i") next to individual inputs inside a tool.
 *
 * Edit copy here once; every consumer (toolbar + component) stays in sync.
 */
export interface ToolInfo {
	summary: string;
	fields?: Record<string, string>;
}

export const TOOL_INFO: Record<string, ToolInfo> = {
	"/tools/bayes": {
		summary:
			"Updates a probability after new evidence using Bayes' theorem. Enter how likely something is to be true to begin with and how reliable your test is, and it calculates the revised probability that it's actually true given a positive result. Handy for medical-test and false-positive style questions. Reuse the answer as the next starting point to chain several updates together.",
		fields: {
			prior:
				"Before any test, out of 100 similar cases, how many are actually true? Example: if a condition affects 1 in 100 people, enter 1.",
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
			fileUpload:
				"Upload a list from a file instead of pasting it. Accepts plain text, CSV, and TSV files only.",
			caseSensitive:
				"When on, entries are compared exactly as typed, so \"Apple\" and \"apple\" count as different. When off, differences in capitalization are ignored.",
			dedupe:
				"Removes duplicate entries within each list before comparing. Fill only one side to use this as a silent list cleaner.",
			uniqueToA:
				"A \u2216 B \u00b7 entries that appear in List A but not in List B.",
			uniqueToB:
				"B \u2216 A \u00b7 entries that appear in List B but not in List A.",
			intersection:
				"A \u2229 B \u00b7 entries that appear in both List A and List B.",
			union:
				"A \u222A B \u00b7 every unique entry that appears in List A or List B.",
		},
	},
	"/tools/random": {
		summary:
			"Generates random strings to your spec. Choose how many and how long, then tick which character types to allow: lowercase, uppercase, numbers, special characters, and UTF-8. It produces one column where each type may appear and another where every chosen type is guaranteed to appear in each string. Good for passwords, test fixtures, and sample tokens.",
		fields: {
			lowercase:
				"Allows lowercase letters (a\u2013z) in the generated strings.",
			uppercase:
				"Allows uppercase letters (A\u2013Z) in the generated strings.",
			numbers:
				"Allows digits (0\u20139) in the generated strings.",
			special:
				"Allows special characters such as punctuation and symbols (for example ! @ # $ % &) in the generated strings.",
			utf8:
				"Allows a random selection of UTF-8 characters drawn from wider Unicode ranges, useful for stress-testing how systems handle non-ASCII text.",
		},
	},
	"/tools/pascal": {
		summary:
			"Draws Pascal's triangle and computes 'n choose k' (the binomial coefficient). Enter N and K to see how many ways you can pick K items from N, with the matching cell highlighted in the triangle below. A quick visual reference for combinatorics and binomial expansions.",
	},
	"/tools/safecron": {
		summary:
			"Finds the best meeting and downtime windows across multiple time zones. Add each zone your team works in and give it an importance weight, then it overlaps everyone's 9-to-5 working hours on a chart (relative to your local time) and suggests the hour that suits the most people for a meeting and the quietest hour for maintenance or downtime.",
	},
	"/tools/taxes": {
		summary:
			"This tool visualizes a proposed tax system where your tax rate is decided entirely by how your income compares to the poverty line. There are no brackets. The only two numbers needed to draw the whole tax curve are the poverty line from a fixed reference year and today's poverty line. Change those two numbers and watch the curve redraw.",
	},
	"/tools/pwned": {
		summary:
			"Checks whether a password has appeared in a known data breach. Type a password and press the Right Arrow key (or the Check button) to see a green check if it's safe or a red mark if it's been exposed. It uses k-anonymity: only the first five characters of the password's SHA-1 hash are sent to the breach database, so the password itself never leaves your browser.",
	},
};
