import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-listiterator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './listiterator.component.html',
  styleUrls: ['./listiterator.component.scss']
})
export class ListiteratorComponent implements OnInit, OnDestroy {
  numberOfIterations: number | null = null;
  prefixInput: string = '';
  bodyInput: string = '';
  suffixInput: string = '';
  arbitraryCharacterInput: string = '';

  // Checkbox controls
  alpha: boolean = false;
  numeric: boolean = false;

  // Output
  theIterationList: string = '';

  private resizeTimer: any;

  // Computed property for safe HTML display
  get theIterationListDisplay(): string {
    return this.theIterationList.replace(/\n/g, '<br>');
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

  private onWindowResize(): void {
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
    this.resizeTimer = setTimeout(() => {
      this.resizeElements();
    }, 100);
  }

  private resizeElements(): void {
    // Resize logic if needed
  }

  private loadFromStorage(): void {
    const saved = localStorage.getItem('listiterator-data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.numberOfIterations = data.numberOfIterations || null;
        this.prefixInput = data.prefixInput || '';
        this.bodyInput = data.bodyInput || '';
        this.suffixInput = data.suffixInput || '';
        this.arbitraryCharacterInput = data.arbitraryCharacterInput || '';
        this.alpha = data.alpha || false;
        this.numeric = data.numeric || false;
      } catch (e) {
        console.error('Failed to load from storage:', e);
      }
    }
  }

  private saveToStorage(): void {
    const data = {
      numberOfIterations: this.numberOfIterations,
      prefixInput: this.prefixInput,
      bodyInput: this.bodyInput,
      suffixInput: this.suffixInput,
      arbitraryCharacterInput: this.arbitraryCharacterInput,
      alpha: this.alpha,
      numeric: this.numeric
    };
    localStorage.setItem('listiterator-data', JSON.stringify(data));
  }

  generateIt(): void {
    if (!this.numberOfIterations || this.numberOfIterations <= 0) {
      this.theIterationList = '';
      return;
    }

    let baseCharacters = '';

    if (this.alpha) {
      baseCharacters += 'abcdefghijklmnopqrstuvwxyz';
    }

    if (this.numeric) {
      baseCharacters += '0123456789';
    }

    if (this.arbitraryCharacterInput.trim()) {
      baseCharacters += this.arbitraryCharacterInput.trim();
    }

    if (!baseCharacters) {
      baseCharacters = '0123456789'; // Default to numeric if nothing selected
    }

    // Convert to array for easier manipulation
    const arbitraryCharacterArray = baseCharacters.split('');
    const results: string[] = [];

    // If bodyInput is provided, use it as starting point and increment from there
    let currentBody = this.bodyInput || arbitraryCharacterArray[0];

    // Validate that bodyInput contains only characters from our character set
    if (this.bodyInput) {
      const validPattern = new RegExp(`^[${baseCharacters.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]+$`);
      if (!validPattern.test(this.bodyInput)) {
        this.theIterationList = 'Error: Body input contains invalid characters';
        return;
      }
    }

    for (let i = 0; i < this.numberOfIterations; i++) {
      const result = this.prefixInput + currentBody + this.suffixInput;
      results.push(result);

      if (i < this.numberOfIterations - 1) {
        currentBody = this.incrementCharacterSequence(currentBody, arbitraryCharacterArray);
      }
    }

    this.theIterationList = results.join('\n');
    this.saveToStorage();
  }

  private incrementCharacterSequence(sequence: string, characterArray: string[]): string {
    const chars = sequence.split('');
    return this.incrementCharacterByIndexRecursive(chars, chars.length - 1, characterArray);
  }

  private incrementCharacterByIndexRecursive(charArray: string[], index: number, arbitraryCharacterArray: string[]): string {
    if (index < 0) {
      // Need to add a new character at the beginning
      return arbitraryCharacterArray[1] + charArray.join('');
    }

    const currentChar = charArray[index];
    const currentIndex = arbitraryCharacterArray.indexOf(currentChar);

    if (currentIndex === arbitraryCharacterArray.length - 1) {
      // Current character is the last in the array, reset to first and carry over
      charArray[index] = arbitraryCharacterArray[0];
      if (index === 0) {
        // If we're at the first position, add a new character
        return arbitraryCharacterArray[1] + charArray.join('');
      }
      // Recursively increment the previous character
      return this.incrementCharacterByIndexRecursive(charArray, index - 1, arbitraryCharacterArray);
    } else {
      // Increment to next character
      charArray[index] = arbitraryCharacterArray[currentIndex + 1];
      return charArray.join('');
    }
  }

  reset(): void {
    this.numberOfIterations = null;
    this.prefixInput = '';
    this.bodyInput = '';
    this.suffixInput = '';
    this.arbitraryCharacterInput = '';
    this.alpha = false;
    this.numeric = false;
    this.theIterationList = '';
    localStorage.removeItem('listiterator-data');
  }

  onArbitraryCharacterInputChange(): void {
    if (this.arbitraryCharacterInput.trim()) {
      this.alpha = false;
      this.numeric = false;
    }
    this.saveToStorage();
  }

  onAlphaNumericChange(): void {
    if (this.alpha || this.numeric) {
      this.arbitraryCharacterInput = '';
    }
    this.saveToStorage();
  }
}
