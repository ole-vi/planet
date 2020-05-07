import { Component, Input, ViewChild } from '@angular/core';

import { environment } from '../../../environments/environment';
import { MatMenuTrigger } from '@angular/material';
import { MatDialog } from '@angular/material';
import { DialogsResourcesViewerComponent } from '../../shared/dialogs/dialogs-resources-viewer.component';

@Component({
  selector: 'planet-resources-menu',
  template: `
    <button mat-raised-button [color]="color" class="margin-lr-10" [matMenuTriggerFor]="resourceList" (click)="buttonClick(resources)">
      <ng-content></ng-content>
    </button>
    <mat-menu #resourceList="matMenu">
      <span *ngFor="let resource of resources;" mat-menu-item (click)="resource._attachments ? openResource(resource._id) : false" [ngClass]="{'cursor-pointer': resource._attachments}">{{resource.title}}</span>
    </mat-menu>
  `
})
export class ResourcesMenuComponent {

  @Input() resources: any[] = [];
  @Input() color = 'accent';
  @ViewChild(MatMenuTrigger, { static: false }) resourceButton: MatMenuTrigger;

  constructor(
    private dialog: MatDialog,
  ) {}

  resourceUrl(resource) {
    if (resource._attachments && Object.keys(resource._attachments)[0]) {
      const filename = resource.openWhichFile || Object.keys(resource._attachments)[0];
      return environment.couchAddress + '/resources/' + resource._id + '/' + filename;
    }
  }

  openResource(resourceId) {
        this.dialog.open(DialogsResourcesViewerComponent, { data: { resourceId }, autoFocus: false });
  }

  buttonClick(resources) {
    if (resources.length === 1) {
      window.open(this.resourceUrl(resources[0]), '_blank');
      this.resourceButton.closeMenu();
    }
  }

}
