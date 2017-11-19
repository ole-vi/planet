/*
 * Bootstrap modal for deleting from Planet
 * type - Required.  Sets the text of the main message on the modal.  See HTML for options.
 * deleteItem - Required.  Object which is the main argument for the delete method located
 *  in the parent component this is called from.
 * message - Optional.  Error message that is displayed when value is truthy.
 * displayName - Optional. If deleteItem does not have a 'name' property, set this to
 *  display to the user what is being deleted.
 * okClick - Required.  Method from parent which is called to delete.
 */
import { Component, OnChanges, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'planet-alerts-delete',
  templateUrl: './alerts-delete.component.html'
})
export class AlertsDeleteComponent implements OnChanges {

  message = '';

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) { }

  ok() {
    this.data.okClick();
  }

  closeAlert() {
    this.message = '';
  }

}
