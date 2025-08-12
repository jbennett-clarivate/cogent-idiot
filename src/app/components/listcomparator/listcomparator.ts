import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-listcomparator',
  imports: [FormsModule, CommonModule],
  templateUrl: './listcomparator.html',
  styleUrl: './listcomparator.scss'
})
export class ListcomparatorComponent implements OnInit {
  inputListA: string = '';
  inputListB: string = '';

  inputListACount: number = 0;
  inputListBCount: number = 0;
  outputListACount: number = 0;
  outputListBCount: number = 0;
  outputListIntersectionCount: number = 0;
  outputListUnionCount: number = 0;

  outputListA: string = '';
  outputListB: string = '';
  outputListIntersection: string = '';
  outputListUnion: string = '';

  lowercase: boolean = false;
  tabs: boolean = false;
  commas: boolean = false;
  spaces: boolean = false;
  doublequote: boolean = false;
  semicolons: boolean = false;
  singlequote: boolean = false;

  ngOnInit(): void {
    this.loadFromLocalStorage();
  }

  onFileSelectedA(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.inputListA = e.target.result;
        this.saveToLocalStorage();
      };
      reader.readAsText(file);
    }
  }

  onFileSelectedB(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.inputListB = e.target.result;
        this.saveToLocalStorage();
      };
      reader.readAsText(file);
    }
  }

  onPaste(event: ClipboardEvent): void {
    // Handle paste events if needed
    this.saveToLocalStorage();
  }

  compareIt(): void {
    if (!this.inputListA || !this.inputListB) {
      return;
    }

    // Reset outputs
    this.outputListA = '';
    this.outputListB = '';
    this.outputListIntersection = '';
    this.outputListUnion = '';

    // Process and dedupe input lists
    const processedListA = this.dedupe(this.inputListA);
    const processedListB = this.dedupe(this.inputListB);

    this.inputListACount = processedListA.split('\n').length;
    this.inputListBCount = processedListB.split('\n').length;

    // Generate outputs
    const uniqueToA = this.uniqueToLeftList(processedListA, processedListB);
    const uniqueToB = this.uniqueToLeftList(processedListB, processedListA);
    const intersection = this.intersection(processedListA, processedListB);
    const union = this.union(processedListA, processedListB);

    // Set counts
    this.outputListACount = uniqueToA ? uniqueToA.split('\n').length : 0;
    this.outputListBCount = uniqueToB ? uniqueToB.split('\n').length : 0;
    this.outputListIntersectionCount = intersection ? intersection.split('\n').length : 0;
    this.outputListUnionCount = union ? union.split('\n').length : 0;

    // Convert to HTML for display
    this.outputListA = this.textToHtml(uniqueToA);
    this.outputListB = this.textToHtml(uniqueToB);
    this.outputListIntersection = this.textToHtml(intersection);
    this.outputListUnion = this.textToHtml(union);

    // Save settings to localStorage
    this.saveToLocalStorage();
  }

  reset(): void {
    // Clear input lists
    this.inputListA = '';
    this.inputListB = '';

    // Reset count values
    this.inputListACount = 0;
    this.inputListBCount = 0;
    this.outputListACount = 0;
    this.outputListBCount = 0;
    this.outputListIntersectionCount = 0;
    this.outputListUnionCount = 0;

    // Clear output lists
    this.outputListA = '';
    this.outputListB = '';
    this.outputListIntersection = '';
    this.outputListUnion = '';

    // Reset delimiter options
    this.lowercase = false;
    this.tabs = false;
    this.commas = false;
    this.spaces = false;
    this.doublequote = false;
    this.semicolons = false;
    this.singlequote = false;

    // Clear localStorage
    this.clearLocalStorage();
  }

  private dedupe(srcInputList: string): string {
    if (!srcInputList) return '';

    let inputList = (this.lowercase ? srcInputList.toLowerCase() : srcInputList).trim();

    const combinedRegex = ['\\n', '\\r'];
    if (this.tabs) combinedRegex.push('\\t');
    if (this.spaces) combinedRegex.push(' ');
    if (this.semicolons) combinedRegex.push(';');
    if (this.commas) combinedRegex.push(',');
    if (this.singlequote) combinedRegex.push("'");
    if (this.doublequote) combinedRegex.push('"');

    const newRegex = '(' + combinedRegex.join('|') + ')+';
    const re = new RegExp(newRegex, 'g');

    const theListArray = inputList.replace(re, '\n').split(/\n/g);
    const map: { [key: string]: number } = {};
    let cleanList = '';

    theListArray.forEach(value => {
      const trimmed = value.trim();
      if (trimmed !== '' && map[trimmed] !== 1) {
        cleanList += value + '\n';
        map[trimmed] = 1;
      }
    });

    return cleanList.trim();
  }

  private uniqueToLeftList(left: string, right: string): string {
    if (!left || !right) return '';

    const leftArray = left.split('\n');
    const rightArray = right.split('\n');
    const map: { [key: string]: number } = {};
    let uniqueList = '';

    rightArray.forEach(value => {
      map[value] = 1;
    });

    leftArray.forEach(value => {
      if (map[value] !== 1) {
        uniqueList += value + '\n';
      }
    });

    return uniqueList.trim();
  }

  private intersection(left: string, right: string): string {
    if (!left || !right) return '';

    const leftArray = left.split('\n');
    const rightArray = right.split('\n');
    const map: { [key: string]: number } = {};
    let intersectionList = '';

    rightArray.forEach(value => {
      map[value.trim()] = 1;
    });

    leftArray.forEach(value => {
      const trimmed = value.trim();
      if (map[trimmed] === 1) {
        intersectionList += trimmed + '\n';
      }
    });

    return intersectionList.trim();
  }

  private union(left: string, right: string): string {
    if (!left || !right) return '';
    return this.dedupe(left + '\n' + right);
  }

  private textToHtml(text: string): string {
    if (!text) return '';
    return text.split('\n').join('<br>');
  }

  private saveToLocalStorage(): void {
    localStorage.setItem('listComparator_inputListA', this.inputListA || '');
    localStorage.setItem('listComparator_inputListB', this.inputListB || '');
    localStorage.setItem('listComparator_lowercase', this.lowercase.toString());
    localStorage.setItem('listComparator_tabs', this.tabs.toString());
    localStorage.setItem('listComparator_commas', this.commas.toString());
    localStorage.setItem('listComparator_spaces', this.spaces.toString());
    localStorage.setItem('listComparator_doublequote', this.doublequote.toString());
    localStorage.setItem('listComparator_semicolons', this.semicolons.toString());
    localStorage.setItem('listComparator_singlequote', this.singlequote.toString());
  }

  private loadFromLocalStorage(): void {
    const inputListA = localStorage.getItem('listComparator_inputListA');
    const inputListB = localStorage.getItem('listComparator_inputListB');

    if (inputListA) this.inputListA = inputListA;
    if (inputListB) this.inputListB = inputListB;

    this.lowercase = localStorage.getItem('listComparator_lowercase') === 'true';
    this.tabs = localStorage.getItem('listComparator_tabs') === 'true';
    this.commas = localStorage.getItem('listComparator_commas') === 'true';
    this.spaces = localStorage.getItem('listComparator_spaces') === 'true';
    this.doublequote = localStorage.getItem('listComparator_doublequote') === 'true';
    this.semicolons = localStorage.getItem('listComparator_semicolons') === 'true';
    this.singlequote = localStorage.getItem('listComparator_singlequote') === 'true';
  }

  private clearLocalStorage(): void {
    localStorage.removeItem('listComparator_inputListA');
    localStorage.removeItem('listComparator_inputListB');
    localStorage.removeItem('listComparator_lowercase');
    localStorage.removeItem('listComparator_tabs');
    localStorage.removeItem('listComparator_commas');
    localStorage.removeItem('listComparator_spaces');
    localStorage.removeItem('listComparator_doublequote');
    localStorage.removeItem('listComparator_semicolons');
    localStorage.removeItem('listComparator_singlequote');
  }
}
