import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ExamsAddComponent } from './exams-add.component';
import { ExamsQuestionComponent } from './exams-question.component';
import { ExamsViewComponent } from './exams-view.component';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { MaterialModule } from '../shared/material.module';
import { PlanetLanguageModule } from '../shared/planet-language.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    PlanetDialogsModule,
    MaterialModule,
    PlanetLanguageModule
  ],
  declarations: [
    ExamsAddComponent,
    ExamsQuestionComponent,
    ExamsViewComponent
  ]
})
export class ExamsModule {}
