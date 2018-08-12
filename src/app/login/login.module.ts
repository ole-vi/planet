import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoginComponent } from './login.component';
import { LoginRouterModule } from './login-router.module';
import { MaterialModule } from '../shared/material.module';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { LoginFormComponent } from './login-form.component';
import { LowercaseDirective } from '../shared/lowercase.directive';
import { ConfigurationGuard } from '../configuration/configuration-guard.service';
import { MatTooltipModule } from '@angular/material';
import { ConfigurationModule } from '../configuration/configuration.module';
import { PlanetLanguageModule } from '../shared/planet-language.module';
import { SharedComponentsModule } from '../shared/shared-components.module';

@NgModule({
  imports: [
    LoginRouterModule,
    FormsModule,
    CommonModule,
    MaterialModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    ConfigurationModule,
    PlanetLanguageModule,
    SharedComponentsModule
  ],
  declarations: [
    LoginComponent, LoginFormComponent, LowercaseDirective
  ],
  providers: [ ConfigurationGuard ]
})
export class LoginModule { }
