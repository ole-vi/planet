import { ValidatorFn, AbstractControl, ValidationErrors, Validators, FormGroup } from '@angular/forms';
import { Subject, combineLatest } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export class CustomValidators {
  // these validators are for cases when the browser does not support input type=date,time and color and the browser falls back to type=text
  static integerValidator(ac: AbstractControl): ValidationErrors {
    const isValidInt = Number.isInteger(ac.value);
    return isValidInt ? null : { invalidInt: true };
  }

  static numberValidator(ac: AbstractControl): ValidationErrors {
    if (!ac.value) {
      return null;
    }
    return (ac.value > 0) ? null : { invalidInt : true };
  }

  static positiveNumberValidator(ac: AbstractControl): ValidationErrors {
    if (!ac.value) {
      return null;
    }
    return (ac.value > 0) ? null : { invalidPositive : true };
  }

  static choiceSelected(requireCorrect: boolean) {
    return (ac: AbstractControl): ValidationErrors => {
      if (!ac.parent || !requireCorrect) {
        return null;
      }

      const inputtype = ac.parent.get('type');
      if ((inputtype.value === 'select' || inputtype.value === 'selectMultiple') && ac.value.length === 0) {
        return { required: true };
      } else {
        return null;
      }
    };
  }

  static hexValidator(ac: AbstractControl): ValidationErrors {

    if (!ac.value) {
      return null;
    }

    const isValidHex = /^#[A-F0-9]{6}$/i.test(ac.value);

    return isValidHex ? null : { invalidHex: true };
  }

  // Allows us to supply a different errorType for specific patterns
  static pattern(pattern, errorType = 'pattern') {
    return (ac: AbstractControl): ValidationErrors => {
      return Validators.pattern(pattern)(ac) ? { [errorType]: true } : null;
    };
  }

  static dateValidator(ac: AbstractControl): ValidationErrors {

    if (!ac.value) {
      return null;
    }

    // the regex is for yyyy-mm-dd because input type=date always evaluates to this form regardless of how it may appear to the user
    const dateRegEx = /^\d{4}-\d{2}-\d{2}/;

    if (!ac.value.match(dateRegEx)) {
      return { invalidDateFormat: true };
    }

    const date = new Date(ac.value);

    if (!date.getTime()) {
      return { invalidDate: true };
    }

    return null;
  }

  // for validating whether end date comes before start date or not
  static endDateValidator(): ValidatorFn {
    let startDate: AbstractControl;
    let endDate: AbstractControl;

    // for unsubscribing from Observables
    const ngUnsubscribe: Subject<void> = new Subject<void>();

    return (ac: AbstractControl): ValidationErrors => {
      if (!ac.parent) {
        return null;
      }

      if (!endDate) {
        endDate = ac;
        startDate = ac.parent.get('startDate');
        if (!startDate) {
          throw new Error(
            'validateDates(): startDate control is not found in parent group'
          );
        }

        // run validators again on when start date's value changes
        startDate.valueChanges.pipe(takeUntil(ngUnsubscribe)).subscribe(() => {
          endDate.updateValueAndValidity();
        });
      }

      // if start date has not been given a value yet return back
      if (!startDate || !endDate.value) {
        return null;
      }

      // converts value from input type=date to Date obj for easy comparision
      if (
        new Date(startDate.value).getTime() > new Date(endDate.value).getTime()
      ) {
        return { invalidEndDate: true };
      }
    };
  }

  private static formError(ac: AbstractControl, error: string, newError: boolean) {
    if (ac.status === 'INVALID' && Object.keys(ac.errors).some(key => key !== error)) {
      return ac.errors;
    }
    return newError ? { [error]: newError } : null;
  }

  private static setFormError(ac: AbstractControl, error: string, newError: boolean) {
    ac.setErrors(this.formError(ac, error, newError));
  }

  private static formDateToString(ac: AbstractControl) {
    return (ac.value || {}).toString();
  }

  // Start time becomes required if end time exists
  // End time becomes required for multi day events with a start time
  static meetupTimeValidator(): ValidatorFn {

    return (formGroup: FormGroup): ValidationErrors => {
      if (!formGroup) {
        return null;
      }

      const startTime = formGroup.get('startTime');
      const endTime = formGroup.get('endTime');
      const startDate = formGroup.get('startDate');
      const endDate = formGroup.get('endDate');

      this.setFormError(startTime, 'required', !!formGroup.get('endTime').value && !startTime.value);
      this.setFormError(endTime, 'required',
        this.formDateToString(startDate) !== this.formDateToString(endDate) &&
        endDate.value &&
        startTime.value &&
        !endTime.value
      );
      this.setFormError(endTime, 'invalidEndTime', this.endTimeValidator(startDate, endDate, startTime, endTime));

    };

  }

  // for validating whether end time comes before start date or not
  private static endTimeValidator(startDate, endDate, startTime, endTime): boolean {
    // if start time has not been given a value yet return back
    if (!startTime || !endTime.value) {
      return false;
    }

    const startDateString = new Date(startDate.value || '1970-1-1').toLocaleDateString('en-US');
    const endDateString = new Date(endDate.value || startDateString).toLocaleDateString('en-US');

    // cannot directly convert time (HH:MM) to Date object so changed it to a Unix time date
    if (
      new Date(startDateString + ' ' + startTime.value).getTime() >
      new Date(endDateString + ' ' + endTime.value).getTime()
    ) {
      return true;
    }

    return false;
  }

  // Set this on both password and confirmation fields so it runs when either changes
  // confirm should be true for the confirmation field validator
  // match is true by default, for unmatching passwords, match should be false
  static matchPassword(matchField: string, confirm: boolean, match: boolean = true): ValidatorFn {

    return (ac: AbstractControl) => {
      if (!ac.parent) {
        return null;
      }

      const matchControl = ac.parent.get(matchField),
        val1 = ac.value,
        val2 = matchControl.value,
        confirmControl: AbstractControl = confirm ? ac : matchControl,
        errorType = match ? 'matchPassword' : 'unmatchPassword';

      // If passwords do not match when match=true, set error for confirmation field
      // If passwords match when match=false, set error for confirmation field
      if (match === (val1 !== val2)) {
        confirmControl.setErrors({ [errorType]: false });
        // If this is set on the confirmation field, also return error
        if (confirm) {
          return { [errorType]: false };
        }
      } else {
        // Remove error
        confirmControl.setErrors(null);
      }
      return null;
    };
  }

  // matDatepicker returns null for date missing or invalid date
  // Use this validator for special date message
  static dateValidRequired(ac: AbstractControl): ValidationErrors {
    if (!ac.value) {
      return { dateRequired: true };
    }
  }

  static isQuestionValid(hasCorrectAnswer) {
    return (question) => {
      if (question.type === 'select' || question.type === 'selectMultiple') {
        return (
          (question.correctChoice.length === 0 && hasCorrectAnswer) ||
          question.choices.length === 0 ||
          question.choices.find((choice: any) => choice.text === '') !== undefined
        );
      }
      return question.body === '';
    };
  }

  static questionValidator(hasCorrectAnswer): ValidatorFn {
    return (ac: AbstractControl) => {
      const invalidQuestion = ac.value.find(this.isQuestionValid(hasCorrectAnswer));
      if (invalidQuestion !== undefined) {
        return { questionError: true };
      }
    };
  }

  static required(ac: AbstractControl) {
    return /\S/.test(ac.value) ? null : { 'required': true };
  }

  static fileMatch(ac: AbstractControl, fileList: string[]) {
    if (fileList.length > 1 && ac.value !== '' && !fileList.includes(ac.value)) {
      return { 'notFileMatch': true };
    }
    return null;
  }

}
