import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { environment } from '../../../environments/environment';
import { UserService } from '../../shared/user.service';
import { Validators } from '@angular/forms';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { CustomValidators } from '../../validators/custom-validators';
import { Location } from '@angular/common';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';

@Component({
  templateUrl: './users-profile.component.html',
  styles: [ `
    .space-container {
      margin: 64px 30px;
    }
    .back {
      background-color:#fff;
      padding: 8%;
    }
    img.user-profile {
      width: 119%;
    }
    mat-list-item h3{
      color:#2196f3;
    }
  ` ]
})
export class UsersProfileComponent implements OnInit {
  private dbName = '_users';
  userDetail: any = {};
  imageSrc = '';
  urlPrefix = environment.couchAddress + this.dbName + '/';
  name = '';
  roles = [];
  urlName = '';

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    private userService: UserService,
    private dialogsFormService: DialogsFormService,
    private location: Location
  ) { }

  ngOnInit() {
    Object.assign(this, this.userService.get());
    this.profileView();
  }

  profileView() {
    this.urlName = this.route.snapshot.paramMap.get('name');
    this.couchService.get(this.dbName + '/org.couchdb.user:' + this.urlName).subscribe((response) => {
      const { derived_key, iterations, password_scheme, salt, ...userDetail } = response;
      this.userDetail = userDetail;
      if (response['_attachments']) {
        const filename = Object.keys(response._attachments)[0];
        this.imageSrc = this.urlPrefix + '/org.couchdb.user:' + this.urlName + '/' + filename;
      }
    }, (error) => {
      console.log(error);
    });
  }

  onSubmit(credentialData, userDetail) {
    const updateDoc = Object.assign({ password: credentialData.password }, userDetail);
    this.changePasswordRequest(updateDoc).pipe(switchMap((response) => {
      if (response.ok === true) {
        this.userDetail._rev = response._rev;
        return this.reinitSession(userDetail.name, credentialData.password);
      }
      return of({ ok: false, reason: 'Error changing password' });
    })).subscribe((res) => {
      if (res.ok === true) {
        // TODO: Should notify user that password successfully changed or that there was an error
      }
    });
  }

  changePasswordRequest(userData) {
    return this.couchService.put(this.dbName + '/' + userData._id, userData);
  }

  reinitSession(username, password) {
    return this.couchService.post('_session', { 'name': username, 'password': password }, { withCredentials: true });
  }

  changePasswordForm(userDetail) {
    const title = 'Change Password';
    const fields = this.newChangePasswordFormFields();
    const formGroup = this.newChangePasswordFormGroup();
    this.dialogsFormService
      .confirm(title, fields, formGroup)
      .debug('Dialog confirm')
      .subscribe((res) => {
        if (res !== undefined) {
          this.onSubmit(res, userDetail);
        }
      });
  }

  newChangePasswordFormFields() {
    return [
      {
        'label': 'Password',
        'type': 'textbox',
        'inputType': 'password',
        'name': 'password',
        'placeholder': 'Password',
        'required': true
      },
      {
        'label': 'Confirm Password',
        'type': 'textbox',
        'inputType': 'password',
        'name': 'confirmPassword',
        'placeholder': 'Confirm Password',
        'required': true
      }
    ];
  }

  newChangePasswordFormGroup() {
    return {
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
    };
  }

  goBack() {
    this.location.back();
  }

  searchFilter(filterValue: string) {
    this.userDetail.filter = filterValue.trim().toLowerCase();
  }

}
