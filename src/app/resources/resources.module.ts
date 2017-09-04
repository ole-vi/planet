import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ResourcesComponent } from './resources.component';
import { ResourcesRouterModule } from './resources-router.module'

@NgModule({
  imports: [
    ResourcesRouterModule,FormsModule,CommonModule
  ],
  declarations: [
    ResourcesComponent
  ]
})
export class ResourcesModule {}