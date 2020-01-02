import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: 'input[planetTimeMask]'
})
export class TimeMaskDirective {

  constructor(private _el: ElementRef) { }

  @HostListener('input', [ '$event' ]) onInputChange(event) {
    const inputTime = this._el.nativeElement.value;
    this._el.nativeElement.value = this.getOutputTime(inputTime);
    console.log(this.getOutputTime(inputTime));
    if ( inputTime !== this._el.nativeElement.value) {
      event.stopPropagation();
    }
  }

  getOutputTime(inputTime: String): String {
    inputTime = inputTime.replace(/[^0-9]*/g, '');
    let outputTime = '';
    const regexp = new RegExp('^([0-9]|0[0-9]|1[0-9]|2[0-3])(:([0-5]|[0-5][0-9])?)?$');
    if (inputTime.length === 4) {
      outputTime = inputTime.substring(0, 2) + ':' + inputTime.substring(2, 4);
      if (!regexp.test(outputTime)) {
        inputTime = inputTime.substring(0, inputTime.length - 1);
      }
    }
    if (inputTime.length === 3) {
      outputTime = inputTime.substring(0, 1) + ':' + inputTime.substring(1, 3);
      if (!regexp.test(outputTime)) {
        outputTime = inputTime.substring(0, 2) + ':' + inputTime.substring(2, 3);
        if (!regexp.test(outputTime)) {
          inputTime = inputTime.substring(0, inputTime.length - 1);
        }
      }
    }
    if (inputTime.length === 2) {
      outputTime = inputTime.substring(0, 1) + ':' + inputTime.substring(1, 2);
      if (!regexp.test(outputTime)) {
        outputTime = inputTime.substring(0, 2);
        if (!regexp.test(outputTime)) {
          inputTime = inputTime.substring(0, inputTime.length - 1);
        }
      }
    }
    if (inputTime.length === 1) {
      outputTime = inputTime.substring(0, 1) ;
      if (!regexp.test(outputTime)) {
        inputTime = inputTime.substring(0, inputTime.length - 1);
      }
    }
    return outputTime;
  }
}
