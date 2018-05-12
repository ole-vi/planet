/**
 * Centralized component for all form error messages
 * MUST BE WRAPPED IN A mat-error ELEMENT
 * Takes a form control as input and outputs a span element with the error message
 * NOTE: Pattern validator is only used for username as of v0.1.13
 * Message will need update if used for other situations
 */

import { Component, Input } from '@angular/core';
import { AbstractControl, AbstractControlDirective } from '@angular/forms';

@Component({
  selector: 'planet-form-error-messages',
  template: `
    <span *ngIf="shouldShowError()" i18n>{updateError(), select,
      required {This field is required}
      min {The number cannot be below {{number}}}
      duplicate {Value already exists}
      email {Please enter a valid email}
      matchPassword {Passwords must match}
      invalidInt {Please enter a number}
      invalidHex {Hex is not valid}
      invalidTime {Time is invalid}
      invalidDateFormat {Date is in incorrect format}
      invalidDate {Date is invalid}
      invalidEndDate {End date cannot be before start date}
      invalidEndTime {End time cannot be before start time}
      dateInPast {Cannot be before current date}
      invalidOldPassword {Old password isn't valid}
      pattern {Only letters and numbers allowed}
    }</span>
  `
})
export class FormErrorMessagesComponent {

  @Input() private control: AbstractControlDirective | AbstractControl;

  error = '';
  number = 0;

  shouldShowError(): boolean {
    return (
      this.control &&
      this.control.errors &&
      (this.control.dirty || this.control.touched)
    );
  }

  // Show one error at a time
  updateError(): string {
    const errorType = Object.keys(this.control.errors)[0];
    this.number = this.control.errors[errorType].min || this.control.errors[errorType].max || 0;
    return errorType;
  }

}
