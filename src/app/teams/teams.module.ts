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
import { SharedComponentsModule } from '../shared/shared-components.module';
import { TeamsViewFinancesComponent } from './teams-view-finances.component';

@NgModule({
  imports: [
    TeamsRouterModule,
    CommonModule,
    MaterialModule,
    PlanetDialogsModule,
    NewsModule,
    DialogsAddResourcesModule,
    CovalentMarkdownModule,
    SharedComponentsModule
  ],
  declarations: [
    TeamsComponent,
    TeamsViewComponent,
    TeamsViewFinancesComponent
  ]
})
export class TeamsModule {}
