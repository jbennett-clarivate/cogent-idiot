import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
	selector: "app-listrandom",
	imports: [CommonModule, FormsModule],
	templateUrl: "./listrandom.html",
	styleUrls: ["./listrandom.scss"],
})
export class ListrandomComponent {
	stringQuantity = 10;
	stringLength = 8;
	lowercase = true;
	uppercase = false;
	numbers = false;
	special = false;
	utf8 = false;
	mayContainListDisplay = "";
	mustContainListDisplay = "";

	private lowerCaseArray = "abcdefghijklmnopqrstuvwxyz".split("");
	private upperCaseArray = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
	private numericArray = "0123456789".split("");
	private specialCharArray = ["~", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_", "+", "-", "=", "[", "]", "|", "}", ";", "'", ":", "/", ".", ",", "?", ">"];
	private utf8CharArray: string[] = [];
	private benfordLawProbabilityArray = [301, 176, 125, 97, 79, 67, 58, 51, 46];
	private benfordLawArray: string[] = [];

	constructor() {
		this.populateBenfordLawArray();
		this.populateUTF8();
	}

	private getRandomInt(max: number): number {
		return Math.floor(Math.random() * max);
	}

	private getRandomIntInRange(min: number, max: number): number {
		return Math.floor(Math.random() * (max - min)) + min;
	}

	private populateBenfordLawArray() {
		this.benfordLawArray = [];
		for (let i = 0; i < this.benfordLawProbabilityArray.length; i++) {
			for (let j = 0; j < this.benfordLawProbabilityArray[i]; j++) {
				this.benfordLawArray.push((i + 1).toString());
			}
		}
	}

	private populateUTF8() {
		this.utf8CharArray = [];
		const randomnumberRanges = [
			[11904, 12019],
			[12032, 12245],
			[13312, 16383],
			[16384, 19893],
			[19968, 20479],
		];
		const range = randomnumberRanges[this.getRandomInt(randomnumberRanges.length)];
		for (let i = 0; i < 26; i++) {
			const randomnumber = this.getRandomIntInRange(range[0], range[1]);
			this.utf8CharArray.push(String.fromCharCode(randomnumber));
		}
	}

	private shuffleArray<T>(array: T[]): T[] {
		const a = array.slice();
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	private mayContainFunc(dictionary: string[], stringquantity: number, stringlength: number): string[][] {
		const max = dictionary.length;
		const mayContainValue: string[][] = [];
		for (let q = 0; q < stringquantity; q++) {
			const mayContainPart: string[] = [];
			for (let l = 0; l < stringlength; l++) {
				mayContainPart.push(dictionary[this.getRandomInt(max)]);
			}
			mayContainValue.push(mayContainPart);
		}
		return mayContainValue;
	}

	private mustContainFunc(mayContainArrays: string[][], lower: boolean, upper: boolean, num: boolean, spec: boolean, utf8: boolean): string {
		for (let i = 0; i < mayContainArrays.length; i++) {
			const innerArray = mayContainArrays[i];
			let shuffle = false;
			if (num && !/\d/.test(innerArray.join(""))) {
				innerArray[0] = this.benfordLawArray[this.getRandomInt(this.benfordLawArray.length)];
				shuffle = true;
			}
			if (spec && !(/[~!@#$%^&*()_+\-=[\]|};:/.,?><]/.test(innerArray.join("")))) {
				innerArray[1] = this.specialCharArray[this.getRandomInt(this.specialCharArray.length)];
				shuffle = true;
			}
			if (upper && !/[A-Z]/.test(innerArray.join(""))) {
				innerArray[2] = this.upperCaseArray[this.getRandomInt(this.upperCaseArray.length)];
				shuffle = true;
			}
			if (lower && !/[a-z]/.test(innerArray.join(""))) {
				innerArray[3] = this.lowerCaseArray[this.getRandomInt(this.lowerCaseArray.length)];
				shuffle = true;
			}
			if (utf8) {
				innerArray[4] = this.utf8CharArray[this.getRandomInt(this.utf8CharArray.length)];
			}
			mayContainArrays[i] = shuffle ? this.shuffleArray(innerArray) : innerArray;
		}
		return mayContainArrays.map(arr => arr.join("")).join("<br />");
	}

	generateIt() {
		let dictionary: string[] = [];
		if (this.lowercase) dictionary = dictionary.concat(this.lowerCaseArray);
		if (this.uppercase) dictionary = dictionary.concat(this.upperCaseArray);
		if (this.special) dictionary = dictionary.concat(this.specialCharArray);
		if (this.utf8) dictionary = dictionary.concat(this.utf8CharArray);
		if (this.numbers) {
			const subDict = this.numericArray;
			if (dictionary.length === 0) {
				dictionary = subDict;
			} else {
				let leftMult = 13, rightMult = 5;
				while (rightMult--) dictionary = dictionary.concat(dictionary);
				while (leftMult--) dictionary = dictionary.concat(subDict);
			}
		}
		if (dictionary.length === 0) dictionary = this.lowerCaseArray;
		const mayContainArrays = this.mayContainFunc(dictionary, this.stringQuantity, this.stringLength);
		const mayContainArray: string[] = [];
		for (let i = 0; i < mayContainArrays.length; i++) {
			if (this.numbers && !this.lowercase && !this.uppercase && !this.special && !this.utf8) {
				mayContainArrays[i][0] = this.benfordLawArray[this.getRandomInt(this.benfordLawArray.length)];
			}
			mayContainArray.push(mayContainArrays[i].join(""));
		}
		this.mayContainListDisplay = mayContainArray.join("<br />");
		this.mustContainListDisplay = this.mustContainFunc(mayContainArrays, this.lowercase, this.uppercase, this.numbers, this.special, this.utf8);
	}

	reset() {
		this.stringQuantity = 10;
		this.stringLength = 8;
		this.lowercase = true;
		this.uppercase = false;
		this.numbers = false;
		this.special = false;
		this.utf8 = false;
		this.mayContainListDisplay = "";
		this.mustContainListDisplay = "";
		this.populateUTF8();
	}
}
