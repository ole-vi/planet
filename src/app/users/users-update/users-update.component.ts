import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { CouchService } from '../../shared/couchdb.service';
import { of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../shared/user.service';
import { environment } from '../../../environments/environment';
import { languages } from '../../shared/languages';
import { CustomValidators } from '../../validators/custom-validators';

@Component({
  templateUrl: './users-update.component.html',
  styles: [ `
    .space-container {
      margin: 64px 30px;
    }
    .view-container {
      display: flex;
      flex-wrap: wrap;
    }
    .view-container form {
      margin: 0 10px 10px 0;
    }
  ` ]
})
export class UsersUpdateComponent implements OnInit {
  user: any = {};
  educationLevel = [ 'Beginner', 'Intermediate', 'Advanced', 'Expert' ];
  readonly dbName = '_users'; // make database name a constant
  editForm: FormGroup;
  currentImgKey: string;
  currentProfileImg = 'assets/image.png';
  previewSrc = 'assets/image.png';
  uploadImage = false;
  urlPrefix = environment.couchAddress + this.dbName + '/';
  urlName = '';
  redirectUrl = '/';
  file: any;
  roles: string[] = [];
  languages = languages;
  maxDate = new Date();
  submissionMode = false;

  constructor(
    private fb: FormBuilder,
    private couchService: CouchService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService
  ) {
    this.userData();
  }

  ngOnInit() {
    if (this.route.snapshot.data.submission === true) {
      this.submissionMode = true;
      this.redirectUrl = '/surveys';
      console.log(this.submissionMode);
      return;
    }
    this.urlName = this.route.snapshot.paramMap.get('name');
    this.couchService.get(this.dbName + '/org.couchdb.user:' + this.urlName)
      .subscribe((data) => {
        this.user = data;
        if (this.user.gender || this.user.name !== this.userService.get().name) {
          this.redirectUrl = '../../profile/' + this.user.name;
        }
        this.editForm.patchValue(data);
        if (data['_attachments']) {
          // If multiple attachments this could break? Entering the if-block as well
          this.currentImgKey = Object.keys(data._attachments)[0];
          this.currentProfileImg = this.urlPrefix + '/org.couchdb.user:' + this.urlName + '/' + this.currentImgKey;
          this.uploadImage = true;
        }
        this.previewSrc = this.currentProfileImg;
        console.log('data: ' + data);
      }, (error) => {
        console.log(error);
      });
  }

  userData() {
    this.editForm = this.fb.group({
      firstName: [ '', this.conditionalValidator(Validators.required).bind(this) ],
      middleName: '',
      lastName: [ '', this.conditionalValidator(Validators.required).bind(this) ],
      email: [ '', [ this.conditionalValidator(Validators.required).bind(this), Validators.email ] ],
      language: [ '', this.conditionalValidator(Validators.required).bind(this) ],
      phoneNumber: [ '', this.conditionalValidator(Validators.required).bind(this) ],
      birthDate: [ '', [ this.conditionalValidator(CustomValidators.dateValidRequired).bind(this), CustomValidators.notDateInFuture ] ],
      gender: [ '', this.conditionalValidator(Validators.required).bind(this) ],
      level: [ '', this.conditionalValidator(Validators.required).bind(this) ]
    });
  }

  conditionalValidator(validator: any) {
    return (ac) => this.submissionMode ? null : validator(ac);
  }

  onSubmit() {
    if (this.editForm.valid) {
      this.submitUser();
    } else {
      Object.keys(this.editForm.controls).forEach(field => {
        const control = this.editForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  submitUser() {
    if (this.submissionMode) {
      this.appendToSurvey(this.editForm.value);
    } else {
      const attachment = this.file ? this.createAttachmentObj() : {};
      this.updateUser(Object.assign({}, this.user, this.editForm.value, attachment));
    }
  }

  createAttachmentObj(): object {
    // Unclear if only encoding is base64
    // This ought to cover any encoding as long as the formatting is: ";[encoding],"
    const imgDataArr: string[] = this.file.split(/;\w+,/);
    // Replacing start ['data:'] of content type string
    const contentType: string = imgDataArr[0].replace(/data:/, '');
    const data: string = imgDataArr[1];
    // Create attachment object
    const attachments: object = {};
    // Alter between two possible keys for image element to ensure database updates
    const imgKey: string = this.currentImgKey === 'img' ? 'img_' : 'img';
    attachments[imgKey] = {
      'content_type': contentType,
      'data': data
    };

    return { '_attachments': attachments };
  }

  updateUser(userInfo) {
    // ...is the rest syntax for object destructuring
    this.couchService.put(this.dbName + '/org.couchdb.user:' + this.user.name, { ...userInfo })
    .pipe(
      switchMap(res => {
        userInfo._rev = res.rev;
        if (this.user.name === this.userService.get().name) {
          this.userService.set(userInfo);
        }
        if (this.userService.getConfig().adminName === this.user.name + '@' + this.userService.getConfig().code) {
          return this.updateConfigurationContact(userInfo);
        }
        return of({ ok: true });
      })
    ).subscribe(() => {
      this.goBack();
    },  (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  updateConfigurationContact(userInfo) {
    const { firstName, lastName, middleName, email, phoneNumber, ...otherInfo } = userInfo;
    const newConfig = { ...this.userService.getConfig(), firstName, lastName, middleName, email, phoneNumber };
    return this.couchService.put('configurations/' + this.userService.getConfig()._id, newConfig)
    .pipe(map((res) => {
      this.userService.setConfig(newConfig);
      return res;
    }));
  }

  goBack() {
    this.router.navigate([ this.redirectUrl ], { relativeTo: this.route });
  }

  onImageSelect(img) {
    this.file = img;
    this.previewSrc = img;
    this.uploadImage = true;
  }

  removeImageFile() {
    this.previewSrc = this.currentProfileImg;
    this.file = null;
    this.uploadImage = false;
  }

  appendToSurvey(user) {
    const submissionId = this.route.snapshot.params.id;
    this.couchService.get('submissions/' + submissionId).pipe(switchMap((submission) => {
      return this.couchService.put('submissions/' + submissionId, { ...submission, user });
    })).subscribe(() => {
      this.goBack();
    });
  }

}
