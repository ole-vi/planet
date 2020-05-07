import { Router, ActivatedRoute } from '@angular/router';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

@Component({
  template: `
    <planet-resources-viewer [isDialog]="true" [resourceId]="data.resourceId"></planet-resources-viewer>
    <mat-dialog-actions style="float:right">
      <button mat-dialog-close mat-raised-button i18n>Close</button>
      <button mat-raised-button color="primary" (click)="viewResources()">View Resource</button>
    </mat-dialog-actions>
  `,
  styleUrls: [ './dialogs-resources-viewer.scss' ]
})
export class DialogsResourcesViewerComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<DialogsResourcesViewerComponent>,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  viewResources() {
    this.dialogRef.close();
    this.router.navigate([ `/resources/view/${this.data.resourceId}` ], { relativeTo: this.route });
  }

}
