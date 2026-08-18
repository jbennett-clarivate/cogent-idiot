import { Injectable } from "@angular/core";

@Injectable({
	providedIn: "root",
})
export class AppUtils {
	safeStringCompare(str1: any, str2: any, caseSensitive = false): boolean {
		if (str1 == null || str2 == null) {
			return str1 === str2;
		}

		const s1 = String(str1);
		const s2 = String(str2);

		return caseSensitive ? s1 === s2 : s1.toLowerCase() === s2.toLowerCase();
	}
}