import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CustomValidators } from '../validators/custom-validators';
import { findDocuments } from '../shared/mangoQueries';
import { MatStepper } from '@angular/material';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { environment } from '../../environments/environment';
import { switchMap } from 'rxjs/operators';

const removeProtocol = (str: string) => {
  // RegEx grabs the fragment of the string between '//' and '/'
  // First match includes characters, second does not (so we use second)
  return /\/\/(.*?)\//.exec(str)[1];
};

@Component({
  selector: 'planet-configuration',
  templateUrl: './configuration.component.html'
})
export class ConfigurationComponent implements OnInit {
  @ViewChild('stepper') stepper: MatStepper;
  nationOrCommunity = 'community';
  message = '';
  loginForm: FormGroup;
  configurationFormGroup: FormGroup;
  contactFormGroup: FormGroup;
  nations = [];
  showAdvancedOptions = false;
  isAdvancedOptionsChanged = false;
  isAdvancedOptionConfirmed = false;
  defaultLocal = environment.couchAddress.indexOf('http') > -1 ? removeProtocol(environment.couchAddress) : environment.couchAddress;

  constructor(
    private formBuilder: FormBuilder,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private validatorService: ValidatorService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      name: [ '', Validators.required ],
      password: [
        '',
        Validators.compose([
          Validators.required,
          CustomValidators.matchPassword('confirmPassword', false)
        ])
      ],
      confirmPassword: [
        '',
        Validators.compose([
          Validators.required,
          CustomValidators.matchPassword('password', true)
        ])
      ]
    });
    this.configurationFormGroup = this.formBuilder.group({
      planetType: [ '', Validators.required ],
      localDomain: this.defaultLocal,
      name: [
        '',
        Validators.required,
        this.parentUniqueValidator('name')
      ],
      parentDomain: [ '', Validators.required ],
      preferredLang: [ '', Validators.required ],
      code: [
        '',
        Validators.required,
        this.parentUniqueValidator('code')
      ],
      createdDate: Date.now()
    });
    this.contactFormGroup = this.formBuilder.group({
      firstName: [ '', Validators.required ],
      lastName: [ '', Validators.required ],
      middleName: [ '' ],
      email: [
        '',
        Validators.compose([
          Validators.required,
          Validators.email
        ])
      ],
      phoneNumber: [ '', Validators.required ]
    });
    this.getNationList();
  }

  parentUniqueValidator(controlName: string) {
    return ac => this.validatorService.isUnique$(
      'communityregistrationrequests',
      controlName,
      ac,
      { domain: ac.parent.get('parentDomain').value }
    );
  }

  confirmConfigurationFormGroup() {
    if (this.configurationFormGroup.valid) {
      if (!this.isAdvancedOptionsChanged || this.isAdvancedOptionConfirmed) {
        this.stepper.next();
      }
    }
  }

  localDomainChange(event) {
    this.isAdvancedOptionsChanged = (this.defaultLocal !== event.target.value);
  }

  resetDefault() {
    this.isAdvancedOptionConfirmed = false;
    this.isAdvancedOptionsChanged = false;
    this.configurationFormGroup.get('localDomain').setValue(this.defaultLocal);
  }

  planetNameChange(event) {
    let code = this.configurationFormGroup.get('name').value;
    // convert special character to dot except last character
    code = code.replace(/\W+(?!$)/g, '.').toLowerCase();
    // skip special character if comes as last character
    code = code.replace(/\W+$/, '').toLowerCase();
    this.configurationFormGroup.get('code').setValue(code);
  }

  getNationList() {
    this.couchService.post('nations/_find',
      findDocuments({ 'planetType': 'nation' }, 0 ),
      { domain: environment.centerAddress })
      .subscribe((data) => {
        this.nations = data.docs;
      }, (error) => this.planetMessageService.showAlert('There is a problem getting the list of nations'));
  }

  onChange(selectedValue: string) {
    this.nationOrCommunity = selectedValue;
    if (selectedValue === 'nation') {
      this.configurationFormGroup.patchValue({
        planetType: selectedValue,
        parentDomain: environment.centerAddress
      });
    } else {
      this.configurationFormGroup.patchValue({
        planetType: selectedValue,
        parentDomain: ''
      });
    }
  }

  onSubmitConfiguration() {
    if (this.loginForm.valid && this.configurationFormGroup.valid && this.contactFormGroup.valid) {
      const configuration = Object.assign({ registrationRequest: 'pending' },
        this.configurationFormGroup.value, this.contactFormGroup.value);
      const { confirmPassword, ...credentials } = this.loginForm.value;
      const userDetail: any = {
        ...credentials,
        'roles': [],
        'type': 'user',
        'isUserAdmin': true,
        'joinDate': Date.now(),
        ...this.contactFormGroup.value
      };
      forkJoin([
        // When creating a planet, add admin
        this.couchService.put('_node/nonode@nohost/_config/admins/' + credentials.name, credentials.password),
        // then add user with same credentials
        this.couchService.put('_users/org.couchdb.user:' + credentials.name, userDetail),
        // then add a shelf for that user
        this.couchService.put('shelf/org.couchdb.user:' + credentials.name, { }),
        // then add configuration
        this.couchService.post('configurations', configuration),
        // then post configuration to parent planet's registration requests
        this.couchService.post('communityregistrationrequests', configuration, { domain: configuration.parentDomain })
          .pipe(switchMap(data => {
            // then add user to parent planet with id of configuration and isUserAdmin set to false
            userDetail['requestId'] =  data.id;
            userDetail['isUserAdmin'] =  false;
            return this.couchService.put('_users/org.couchdb.user:' + credentials.name,
              userDetail, { domain: configuration.parentDomain });
          })),
      ]).debug('Sending request to parent planet').subscribe((data) => {
        this.planetMessageService.showMessage('Admin created: ' + data[1].id.replace('org.couchdb.user:', ''));
        this.router.navigate([ '/login' ]);
      }, (error) => this.planetMessageService.showAlert('There was an error creating planet'));
    }
  }

}
