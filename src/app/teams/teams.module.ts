import { NgModule } from '@angular/core';
import { TeamsRouterModule } from './teams-router.module';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../shared/material.module';
import { CovalentMarkdownModule } from '@covalent/markdown';
import { TeamsComponent } from './teams.component';
import { TeamsViewComponent } from './teams-view.component';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { NewsModule } from '../news/news.module';
import { DialogsAddResourcesModule } from '../shared/dialogs/dialogs-add-resources.module';
import { DialogsAddCoursesModule } from '../shared/dialogs/dialogs-add-courses.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { TeamsViewFinancesComponent } from './teams-view-finances.component';
import { PlanetCalendarModule } from '../shared/calendar.module';

@NgModule({
  imports: [
    TeamsRouterModule,
    CommonModule,
    MaterialModule,
    PlanetDialogsModule,
    NewsModule,
    DialogsAddResourcesModule,
    DialogsAddCoursesModule,
    CovalentMarkdownModule,
    SharedComponentsModule,
    PlanetCalendarModule
  ],
  declarations: [
    TeamsComponent,
    TeamsViewComponent,
    TeamsViewFinancesComponent
  ]
})
export class TeamsModule {}
