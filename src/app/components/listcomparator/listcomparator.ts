import { Component, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
	selector: 'app-listcomparator',
	imports: [FormsModule, CommonModule],
	templateUrl: './listcomparator.html',
	styleUrl: './listcomparator.scss'
})
export class ListcomparatorComponent implements OnInit {
	inputListA = signal('');
	inputListB = signal('');
	caseSensitive = signal(false);
	fuzzyMatch = signal(false);
	selectedDelimiters = signal<string[]>([]);
	loadingA = signal(false);
	loadingB = signal(false);
	errorA = signal('');
	errorB = signal('');

	processedListA = computed(() => this.processInput(this.inputListA()));
	processedListB = computed(() => this.processInput(this.inputListB()));
	uniqueToA = computed(() => this.compareLists(this.processedListA(), this.processedListB()));
	uniqueToB = computed(() => this.compareLists(this.processedListB(), this.processedListA()));
	intersection = computed(() => this.processedListA().filter(x => this.processedListB().includes(x)));
	union = computed(() => Array.from(new Set([...this.processedListA(), ...this.processedListB()])));
	inputListACount = computed(() => this.processedListA().length);
	inputListBCount = computed(() => this.processedListB().length);
	outputListACount = computed(() => this.uniqueToA().length);
	outputListBCount = computed(() => this.uniqueToB().length);
	outputListIntersectionCount = computed(() => this.intersection().length);
	outputListUnionCount = computed(() => this.union().length);

	ngOnInit(): void {
		this.loadFromLocalStorage();
	}

	processInput(input: string): string[] {
		const delimiters = this.selectedDelimiters();
		const regex = delimiters.length ? new RegExp(`[${delimiters.join('')}]`, 'g') : /[\n]/g;
		let items = input.split(regex).map(x => x.trim()).filter(x => x);
		if (!this.caseSensitive()) items = items.map(x => x.toLowerCase());
		return Array.from(new Set(items));
	}

	compareLists(listA: string[], listB: string[]): string[] {
		if (this.fuzzyMatch()) {
			return listA.filter(a => !listB.some(b => this.fuzzyEqual(a, b)));
		}
		return listA.filter(a => !listB.includes(a));
	}

	fuzzyEqual(a: string, b: string): boolean {
		return this.levenshtein(a, b) <= 2;
	}

	levenshtein(a: string, b: string): number {
		const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));
		for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
		for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
		for (let i = 1; i <= a.length; i++) {
			for (let j = 1; j <= b.length; j++) {
				const cost = a[i - 1] === b[j - 1] ? 0 : 1;
				matrix[i][j] = Math.min(
					matrix[i - 1][j] + 1,
					matrix[i][j - 1] + 1,
					matrix[i - 1][j - 1] + cost
				);
			}
		}
		return matrix[a.length][b.length];
	}

	onFileSelectedA(event: any): void {
		const file = event.target.files[0];
		if (!file) return;
		this.loadingA.set(true);
		this.errorA.set('');
		if (!['text/plain', 'text/csv', 'text/tab-separated-values'].includes(file.type) && !file.name.match(/\.(txt|csv|tsv)$/i)) {
			this.errorA.set('Unsupported file type');
			this.loadingA.set(false);
			return;
		}
		const reader = new FileReader();
		reader.onload = (e: any) => {
			let content = e.target.result.replace(/\n\n+/g, '\n');
			this.inputListA.set(content);
			this.loadingA.set(false);
			this.saveToLocalStorage();
		};
		reader.onerror = () => {
			this.errorA.set('Error reading file');
			this.loadingA.set(false);
		};
		reader.readAsText(file);
	}

	onFileSelectedB(event: any): void {
		const file = event.target.files[0];
		if (!file) return;
		this.loadingB.set(true);
		this.errorB.set('');
		if (!['text/plain', 'text/csv', 'text/tab-separated-values'].includes(file.type) && !file.name.match(/\.(txt|csv|tsv)$/i)) {
			this.errorB.set('Unsupported file type');
			this.loadingB.set(false);
			return;
		}
		const reader = new FileReader();
		reader.onload = (e: any) => {
			let content = e.target.result.replace(/\n\n+/g, '\n');
			this.inputListB.set(content);
			this.loadingB.set(false);
			this.saveToLocalStorage();
		};
		reader.onerror = () => {
			this.errorB.set('Error reading file');
			this.loadingB.set(false);
		};
		reader.readAsText(file);
	}

	reset(): void {
		this.inputListA.set('');
		this.inputListB.set('');
		this.selectedDelimiters.set([]);
		this.caseSensitive.set(false);
		this.fuzzyMatch.set(false);
		this.errorA.set('');
		this.errorB.set('');
		this.saveToLocalStorage();
	}

	saveToLocalStorage(): void {
		localStorage.setItem('inputListA', this.inputListA());
		localStorage.setItem('inputListB', this.inputListB());
		localStorage.setItem('selectedDelimiters', JSON.stringify(this.selectedDelimiters()));
		localStorage.setItem('caseSensitive', JSON.stringify(this.caseSensitive()));
		localStorage.setItem('fuzzyMatch', JSON.stringify(this.fuzzyMatch()));
	}

	loadFromLocalStorage(): void {
		this.inputListA.set(localStorage.getItem('inputListA') || '');
		this.inputListB.set(localStorage.getItem('inputListB') || '');
		this.selectedDelimiters.set(JSON.parse(localStorage.getItem('selectedDelimiters') || '[]'));
		this.caseSensitive.set(JSON.parse(localStorage.getItem('caseSensitive') || 'false'));
		this.fuzzyMatch.set(JSON.parse(localStorage.getItem('fuzzyMatch') || 'false'));
	}

	exportResults(type: 'csv' | 'txt'): void {
		const data = {
			uniqueToA: this.uniqueToA().join('\n'),
			uniqueToB: this.uniqueToB().join('\n'),
			intersection: this.intersection().join('\n'),
			union: this.union().join('\n')
		};
		let content = '';
		if (type === 'csv') {
			content = `Unique to A,Unique to B,Intersection,Union\n"${data.uniqueToA}","${data.uniqueToB}","${data.intersection}","${data.union}"`;
		} else {
			content = `Unique to A:\n${data.uniqueToA}\n\nUnique to B:\n${data.uniqueToB}\n\nIntersection:\n${data.intersection}\n\nUnion:\n${data.union}`;
		}
		const blob = new Blob([content], { type: type === 'csv' ? 'text/csv' : 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `listcompare.${type}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	toggleDelimiter(delim: string, checked: boolean): void {
		const current = this.selectedDelimiters();
		if (checked && !current.includes(delim)) {
			this.selectedDelimiters.set([...current, delim]);
		} else if (!checked && current.includes(delim)) {
			this.selectedDelimiters.set(current.filter(d => d !== delim));
		}
		this.saveToLocalStorage();
	}
}
