import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl
} from '@angular/forms';
import { CouchService } from '../../shared/couchdb.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../shared/user.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { UsersAchievementsService } from './users-achievements.service';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { StateService } from '../../shared/state.service';
import { catchError } from 'rxjs/operators';
import { CustomValidators } from '../../validators/custom-validators';
import { ValidatorService } from '../../validators/validator.service';
import { forkJoin } from 'rxjs';

@Component({
  templateUrl: './users-achievements-update.component.html',
  styleUrls: [ 'users-achievements-update.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class UsersAchievementsUpdateComponent implements OnInit {

  user = this.userService.get();
  configuration = this.stateService.configuration;
  docInfo = { '_id': this.user._id + '@' + this.configuration.code, '_rev': undefined };
  readonly dbName = 'achievements';
  editForm: FormGroup;
  profileForm: FormGroup;
  get achievements(): FormArray {
    return <FormArray>this.editForm.controls.achievements;
  }
  get references(): FormArray {
    return <FormArray>this.editForm.controls.references;
  }

  constructor(
    private fb: FormBuilder,
    private couchService: CouchService,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private planetMessageService: PlanetMessageService,
    private usersAchievementsService: UsersAchievementsService,
    private dialogsFormService: DialogsFormService,
    private stateService: StateService,
    private validatorService: ValidatorService
  ) {
    this.createForm();
    this.createProfileForm();
  }

  ngOnInit() {
    this.profileForm.patchValue(this.user);
    this.usersAchievementsService.getAchievements(this.docInfo._id)
    .pipe(catchError(() => this.usersAchievementsService.getAchievements(this.user._id)))
    .subscribe((achievements) => {
      this.editForm.patchValue(achievements);
      this.editForm.controls.achievements = this.fb.array(achievements.achievements || []);
      this.editForm.controls.references = this.fb.array(achievements.references || []);
      // Keeping older otherInfo property so we don't lose this info on database
      this.editForm.controls.otherInfo = this.fb.array(achievements.otherInfo || []);
      if (this.docInfo._id === achievements._id) {
        this.docInfo._rev = achievements._rev;
      }
    }, (error) => {
      console.log(error);
    });
  }

  createForm() {
    this.editForm = this.fb.group({
      purpose: '',
      goals: '',
      achievementsHeader: '',
      achievements: this.fb.array([]),
      references: this.fb.array([]),
      // Keeping older otherInfo property so we don't lose this info on database
      otherInfo: this.fb.array([]),
      sendToNation: false
    });
  }

  createProfileForm() {
    this.profileForm = this.fb.group({
      firstName: [ '', CustomValidators.required ],
      middleName: '',
      lastName: [ '', CustomValidators.required ],
      birthDate: [
        '',
        [],
        ac => this.validatorService.notDateInFuture$(ac)
      ],
      birthplace: ''
    });
  }

  addAchievement(index = -1, labelOfDialogBox, achievement = { title: '', description: '', resources: [], date: '' }) {
    if (typeof achievement === 'string') {
      achievement = { title: '', description: achievement, resources: [], date: '' };
    }
    if (achievement.title !== '') {
      labelOfDialogBox = 'Edit Achievement';
    } else {
      labelOfDialogBox = 'Add Achievement';
    }
    this.dialogsFormService.openDialogsForm(
      labelOfDialogBox,
      [
        { 'type': 'textbox', 'name': 'title', 'placeholder': 'Title' },
        { 'type': 'date', 'name': 'date', 'placeholder': 'Date', 'required': false },
        { 'type': 'textarea', 'name': 'description', 'placeholder': 'Description', 'required': false },
        { 'type': 'dialog', 'name': 'resources', 'db': 'resources', 'text': 'Add Resources' }
      ],
      this.fb.group({
        ...achievement,
        resources: [ achievement.resources ],
        title: [ achievement.title, CustomValidators.required ],
        description: [ achievement.description ],
        date: [ achievement.date, null, ac => this.validatorService.notDateInFuture$(ac) ]
      }),
      { onSubmit: this.onDialogSubmit(this.achievements, index), closeOnSubmit: true }
    );
  }

  addReference(index = -1, labelOfDialogBox, reference: any = { name: '' }) {
    if (reference.name !== '') {
      labelOfDialogBox = 'Edit Reference';
    } else {
      labelOfDialogBox = 'Add Reference';
    }
    this.dialogsFormService.openDialogsForm(
      labelOfDialogBox,
      [
        { 'type': 'textbox', 'name': 'name', 'placeholder': 'Name' },
        { 'type': 'textbox', 'name': 'relationship', 'placeholder': 'Relationship', 'required': false },
        { 'type': 'textbox', 'name': 'phone', 'placeholder': 'Phone #', 'required': false },
        { 'type': 'textbox', 'name': 'email', 'placeholder': 'Email', 'required': false }
      ],
      this.fb.group({
        relationship: '',
        phone: '',
        email: '',
        ...reference,
        name: [ reference.name, CustomValidators.required ],
      }),
      { onSubmit: this.onDialogSubmit(this.references, index), closeOnSubmit: true }
    );
  }

  onDialogSubmit(formArray, index) {
    return (formValue, formGroup) => {
      if (formValue === undefined) {
        return;
      }
      this.updateFormArray(formArray, formGroup, index);
    };
  }

  updateFormArray(formArray: FormArray, value, index = -1) {
    if (index === -1) {
      formArray.push(value);
    } else {
      formArray.setControl(index, value);
    }
    this.editForm.updateValueAndValidity();
  }

  onSubmit() {
    this.editForm.updateValueAndValidity();
    if (this.editForm.valid) {
      this.updateAchievements(this.docInfo, this.editForm.value, { ...this.user, ...this.profileForm.value });
    } else {
      Object.keys(this.editForm.controls).forEach(field => {
        const control = this.editForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  updateAchievements(docInfo, achievements, userInfo) {
    // ...is the rest syntax for object destructuring
    forkJoin([
      this.couchService.post(this.dbName, { ...docInfo, ...achievements,
        'createdOn': this.configuration.code, 'username': this.user.name, 'parentCode': this.configuration.parentCode }),
      this.userService.updateUser({ ...userInfo, ...this.userService.credentials })
    ]).subscribe(() => {
      this.planetMessageService.showMessage('Achievements successfully updated');
      this.goBack();
    },  (err) => {
      this.planetMessageService.showAlert('There was an error updating your achievements');
    });
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

  removeResource(achievement: FormControl, resource) {
    achievement.setValue({ ...achievement.value, resources: achievement.value.resources.filter(({ _id }) => _id !== resource._id) });
  }

}
