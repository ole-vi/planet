import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

@Component({
  template: `
    <planet-exams-view [isDialog]="true" [questionNum]="1" [exam]="data.exam" (closePreview)="closeDialog()"></planet-exams-view>
    <mat-dialog-actions>
      <button color="primary" mat-raised-button mat-dialog-close i18n>Close Preview</button>
    </mat-dialog-actions>
  `
})
export class ExamsPreviewComponent {

  constructor(
    public dialogRef: MatDialogRef<ExamsPreviewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  closeDialog() {
    this.dialogRef.close();
  }

}
