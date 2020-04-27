import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { MaterialModule } from '../shared/material.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { HealthComponent } from './health.component';
import { HealthUpdateComponent } from './health-update.component';
import { HealthEventComponent } from './health-event.component';
import { HealthEventDialogComponent } from './health-event-dialog.component';

const routes: Routes = [
  { path: '', component: HealthComponent },
  { path: 'update', component: HealthUpdateComponent },
  { path: 'event', component: HealthEventComponent }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    PlanetDialogsModule,
    MaterialModule,
    SharedComponentsModule
  ],
  declarations: [
    HealthComponent,
    HealthUpdateComponent,
    HealthEventComponent,
    HealthEventDialogComponent
  ],
  providers: [ DatePipe ],
  entryComponents: [ HealthEventDialogComponent ]
})
export class HealthModule {}
