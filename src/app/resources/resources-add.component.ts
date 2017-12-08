import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../shared/user.service';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { CustomValidators } from '../validators/custom-validators';
import { ResourceValidatorService } from '../validators/resource-validator.service';
import * as constants from 'constants';

@Component({
  templateUrl: './resources-add.component.html'
})

export class ResourcesAddComponent implements OnInit {
  name = '';
  message = '';
  subjects = new FormControl();
  subjectList = [ 'Agriculture', 'Arts', 'Business and Finance',
  'Environment', 'Food and Nutrition', 'Geography', 'Health and Medicine',
  'History', 'Human Development', 'Languages', 'Law', 'Learning',
  'Literature', 'Math', 'Music', 'Politics and Government', 'Reference',
  'Religion', 'Science', 'Social Sciences', 'Sports', 'Technology' ];
  levels = new FormControl();
  levelList = [ 'Early Education', 'Lower Primary', 'Upper Primary',
  'Lower Secondary', 'Upper Secondary', 'Undergraduate', 'Graduate', 'Professional' ];
  mediums = [ 'Text', 'Graphic/Pictures', 'Audio/Music/Book', 'Video' ];
  openWith = [ 'Just download', 'HTML', 'PDF.js', 'Bell-Reader', 'MP3', 'Flow Video Player', 'BeLL Video Book Player', 'Native Video' ];
  resourceType = [ 'Textbook', 'Lesson Plan', 'Activities', 'Exercises', 'Discussion Questions' ];
  todaydate = new Date();
  file: any;
  resourceForm: FormGroup;
  readonly dbName = 'resources'; // make database name a constant
  resource = { mediaType: '' };

  constructor(
    private location: Location,
    private router: Router,
    private fb: FormBuilder,
    private couchService: CouchService,
    private resourceValidatorService: ResourceValidatorService,
    private userService: UserService
  ) {
  this.createForm();
  }

  createForm() {
    this.resourceForm = this.fb.group({
      title: [
        '',
        Validators.required,
        // an arrow function is for lexically binding 'this' otherwise 'this' would be undefined
        ac => this.resourceValidatorService.checkResourceExists$(ac)
      ],
      author: '',
      year: '',
      language: '',
      publisher: '',
      linkToLicense: '',
      subject: [ '', Validators.required ],
      level: [ '', Validators.required ],
      openWith: '',
      resourceFor: '',
      medium: '',
      articleDate: new FormControl({ disabled: true }),
      resourceType: '',
      addedBy: new FormControl({ value: 'admin', disabled: true }, Validators.required),
      openUrl: [],
      openWhichFile: ''
    });
  }

  onSubmit() {
    if (this.resourceForm.valid) {
      this.addCourse(this.resourceForm.value);
    } else {
      Object.keys(this.resourceForm.controls).forEach(field => {
        const control = this.resourceForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  async addCourse(resourceInfo) {
    // ...is the rest syntax for object destructuring
    try {
      await this.couchService.post(this.dbName, { ...resourceInfo });
      this.router.navigate([ '/resources' ]);
    } catch (err) {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    }
  }

  ngOnInit() {
  Object.assign(this, this.userService.get());
  }

  cancel() {
    this.location.back();
  }

}
