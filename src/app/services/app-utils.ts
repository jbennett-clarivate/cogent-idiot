import { Injectable } from "@angular/core";

@Injectable({
	providedIn: "root",
})
export class AppUtils {

	/**
	 * Compares two strings in a safe manner, handling null or undefined values.
	 * @param str1 - The first string to compare.
	 * @param str2 - The second string to compare.
	 * @param caseSensitive - Whether the comparison should be case-sensitive.
	 * @returns True if the strings are equal, false otherwise.
	 */
	safeStringCompare(str1: any, str2: any, caseSensitive = false): boolean {
		if (str1 == null || str2 == null) {
			return str1 === str2;
		}

		const s1 = String(str1);
		const s2 = String(str2);

		return caseSensitive ? s1 === s2 : s1.toLowerCase() === s2.toLowerCase();
	}
}