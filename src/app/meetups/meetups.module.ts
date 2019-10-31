import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { MeetupsComponent } from './meetups.component';
import { MeetupsAddComponent } from './add-meetups/meetups-add.component';
import { MeetupsViewComponent } from './view-meetups/meetups-view.component';
import { MeetupsRouterModule } from './meetups-router.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { MaterialModule } from '../shared/material.module';
import { MeetupService } from './meetups.service';
import { MatDialogModule } from '@angular/material/dialog';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { CustomDateAdapter } from './add-meetups/custom-date-adapter';
import { DateAdapter } from '@angular/material';

@NgModule({
  exports: [ MeetupsAddComponent, MeetupsViewComponent ],
  imports: [
    MeetupsRouterModule, ReactiveFormsModule, PlanetFormsModule, CommonModule, FormsModule, PlanetDialogsModule, MaterialModule,
     MatDialogModule, SharedComponentsModule
  ],
  declarations: [
    MeetupsComponent, MeetupsAddComponent, MeetupsViewComponent
  ],
  providers: [ MeetupService, { provide: DateAdapter, useValue: CustomDateAdapter } ]
})
export class MeetupsModule {}
