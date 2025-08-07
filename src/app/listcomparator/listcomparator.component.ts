import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-listcomparator',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './listcomparator.component.html',
  styleUrl: './listcomparator.component.scss'
})
export class ListcomparatorComponent {
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

  onFileSelectedA(event: any): void {
    const file = event.target.files[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.inputListA = e.target.result;
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
      };
      reader.readAsText(file);
    }
  }

  onPaste(event: ClipboardEvent): void {
    // Handle paste events if needed
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
}
