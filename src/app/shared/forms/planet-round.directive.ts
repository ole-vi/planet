import { Directive, Input, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';
import { round } from 'mathjs';

@Directive({
  selector: 'input[planetRound]'
})
export class PlanetRoundDirective {

  @Input('planetRound') precision;

  constructor(
    private ngControl: NgControl
  ) {}

  @HostListener('focusout') onFocusOut() {
    if (typeof this.ngControl.value !== 'number') {
      return;
    }
    const precision = this.precision || 0;
    const rounded = round(+((this.ngControl.value + Number.EPSILON) + `e${precision}`)) + `e${-precision}`;
    this.ngControl.control.setValue(+rounded);
  }

}
