import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-listcleaner',
  imports: [CommonModule, FormsModule],
  templateUrl: './listcleaner.html',
  styleUrls: ['./listcleaner.scss']
})
export class ListcleanerComponent implements OnInit, OnDestroy {
  theInputList: string = '';
  theCleanList: string = '';
  theDirtyList: string = '';
  theInputListCount: number = 0;
  theCleanListCount: number = 0;
  theDirtyListCount: number = 0;

  // Form controls
  lowercase: boolean = false;
  spaces: boolean = false;
  tabs: boolean = false;
  commas: boolean = false;
  semicolons: boolean = false;
  singlequote: boolean = false;
  doublequote: boolean = false;
  customchar: string = '';

  private resizeTimer: any;
  private heightSpeed = 100;

  // Computed properties for safe HTML display
  get theCleanListDisplay(): string {
    return this.theCleanList.replace(/\n/g, '<br>');
  }

  get theDirtyListDisplay(): string {
    return this.theDirtyList.replace(/\n/g, '<br>');
  }

  ngOnInit() {
    this.loadFromStorage();
    this.resizeElements();
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
  }

  private onWindowResize() {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      this.resizeElements();
    }, this.heightSpeed);
  }

  private resizeElements() {
    const portHeight = window.innerHeight;
    const customHeight = Math.max(100, portHeight - 333);
    // Apply height to text areas programmatically
    const elements = document.querySelectorAll('#theinputlist, #thecleanlist, #thedirtylist');
    elements.forEach(el => {
      (el as HTMLElement).style.height = customHeight + 'px';
    });
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private generateSplitRegex(spaces: boolean, tabs: boolean, commas: boolean,
                           semicolons: boolean, singlequote: boolean, doublequote: boolean,
                           customchar: string): RegExp {
    const combinedRegex = ["\\n", "\\r"];

    if (spaces) combinedRegex.push(" ");
    if (tabs) combinedRegex.push("\\t");
    if (commas) combinedRegex.push(",");
    if (semicolons) combinedRegex.push(";");
    if (singlequote) combinedRegex.push("'");
    if (doublequote) combinedRegex.push("\"");
    if (customchar) combinedRegex.push(this.escapeRegExp(customchar));

    const newRegex = combinedRegex.join("");
    return new RegExp("[" + newRegex + "]+", "g");
  }

  cleanList() {
    this.saveToStorage();

    // Reset outputs
    this.theCleanList = '';
    this.theDirtyList = '';
    this.theInputListCount = 0;
    this.theCleanListCount = 0;
    this.theDirtyListCount = 0;

    let cleanCount = 0;
    let dirtyCount = 0;

    if (this.theInputList && this.theInputList.trim() !== "") {
      let theListText = this.theInputList.trim()
        .replace(/<br(\s*)\/*>/ig, "\n")
        .replace(/<[p|div]\s/ig, "\n$0")
        .replace(/(<([^>]+)>)/ig, "\n");

      // Decode HTML entities
      const div = document.createElement('div');
      div.innerHTML = theListText;
      theListText = div.textContent || div.innerText || '';

      if (this.lowercase) {
        theListText = theListText.toLowerCase();
      }

      const theListArray = theListText.split(
        this.generateSplitRegex(
          this.spaces, this.tabs, this.commas, this.semicolons,
          this.singlequote, this.doublequote, this.customchar
        )
      );

      const map: { [key: string]: number } = {};
      let cleanList = "";
      let dirtyList = "";

      theListArray.forEach(value => {
        const trimmedVal = value.trim();
        if (trimmedVal === "") return;

        if (map[trimmedVal] !== 1) {
          cleanCount++;
        } else {
          dirtyList += value + "\n";
          dirtyCount++;
        }
        map[trimmedVal] = 1;
      });

      for (const key in map) {
        if (map.hasOwnProperty(key)) {
          cleanList += key + "\n";
        }
      }

      this.theInputListCount = cleanCount + dirtyCount;
      this.theCleanList = cleanList.trim();
      this.theCleanListCount = cleanCount;
      this.theDirtyList = dirtyList;
      this.theDirtyListCount = dirtyCount;
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      if (file.type === "" || /^text/.test(file.type)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.theInputList = e.target?.result as string || '';
        };
        reader.readAsText(file);
      } else {
        // Handle bad file type
        console.warn('Invalid file type. Please select a text file.');
      }
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text/plain') || '';
    this.theInputList += '\n' + pastedData;
  }

  onInputChange(event: Event) {
    const target = event.target as HTMLElement;
    this.theInputList = target.innerHTML || '';
  }

  private saveToStorage() {
    if (typeof Storage !== "undefined") {
      localStorage.setItem("cleanList", this.theInputList);
      localStorage.setItem("cleanListLower", this.lowercase.toString());
      localStorage.setItem("delimitOnListSpaces", this.spaces.toString());
      localStorage.setItem("delimitOnListTab", this.tabs.toString());
      localStorage.setItem("delimitOnListCommas", this.commas.toString());
      localStorage.setItem("delimitOnListSemicolons", this.semicolons.toString());
      localStorage.setItem("delimitOnListSinglequote", this.singlequote.toString());
      localStorage.setItem("delimitOnListDoublequote", this.doublequote.toString());
      localStorage.setItem("delimitOnListCustomChar", this.customchar);
    }
  }

  private loadFromStorage() {
    if (typeof Storage !== "undefined") {
      this.theInputList = localStorage.getItem("cleanList") || '';
      this.lowercase = localStorage.getItem("cleanListLower") === "true";
      this.spaces = localStorage.getItem("delimitOnListSpaces") === "true";
      this.tabs = localStorage.getItem("delimitOnListTab") === "true";
      this.commas = localStorage.getItem("delimitOnListCommas") === "true";
      this.semicolons = localStorage.getItem("delimitOnListSemicolons") === "true";
      this.singlequote = localStorage.getItem("delimitOnListSinglequote") === "true";
      this.doublequote = localStorage.getItem("delimitOnListDoublequote") === "true";
      this.customchar = localStorage.getItem("delimitOnListCustomChar") || '';
    }
  }

  reset() {
    // Clear input field
    this.theInputList = '';

    // Clear output fields
    this.theCleanList = '';
    this.theInputListCount = 0;
    this.theCleanListCount = 0;
    this.theDirtyListCount = 0;

    // Remove data from localStorage
    if (typeof Storage !== "undefined") {
      localStorage.removeItem("cleanList");
      localStorage.removeItem("cleanListLower");
      localStorage.removeItem("delimitOnListSpaces");
      localStorage.removeItem("delimitOnListTab");
      localStorage.removeItem("delimitOnListCommas");
      localStorage.removeItem("delimitOnListSemicolons");
      localStorage.removeItem("delimitOnListSinglequote");
      localStorage.removeItem("delimitOnListDoublequote");
      localStorage.removeItem("delimitOnListCustomChar");
    }
  }
}
