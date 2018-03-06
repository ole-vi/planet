import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';

import { CouchService } from '../../shared/couchdb.service';
import { CustomValidators } from '../../validators/custom-validators';
import { ValidatorService } from '../../validators/validator.service';
import * as constants from '../constants';
import { MatFormField, MatFormFieldControl } from '@angular/material';
import { PlanetMessageService } from '../../shared/planet-message.service';
//import { Observable } from 'rxjs/Observable'; //maybe i dont need this but it crashed after i removed it

@Component({
  templateUrl: 'courses-add.component.html',
  styles: [ `
    /* Consider using space-container app wide for route views */
    .space-container {
      margin: 64px 30px;
      background: none;
    }
    .view-container {
      background-color: #FFFFFF;
      padding: 1rem;
    }
  ` ]
})
export class CoursesAddComponent implements OnInit {
  // needs member document to implement
  members = [];
  readonly dbName = 'courses'; // make database name a constant
  courseForm: FormGroup;

  showDaysCheckBox = true; // for toggling the days checkbox

  // from the constants import
  gradeLevels = constants.gradeLevels;
  subjectLevels = constants.subjectLevels;
  days = constants.days;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private planetMessageService: PlanetMessageService
  ) {
    this.createForm();
  }

  createForm() {
    this.courseForm = this.fb.group({
      courseTitle: [
        '',
        Validators.required,
        // an arrow function is for lexically binding 'this' otherwise 'this' would be undefined
        this.route.snapshot.url[0].path === 'update'
        ? ac => this.validatorService.isNameAvailible$(this.dbName, 'courseTitle', ac, this.route.snapshot.params.id)
        : ac => this.validatorService.isUnique$(this.dbName, 'courseTitle', ac)
      ],
      description: [ '', Validators.required ],
      languageOfInstruction: '',
      memberLimit: [
        '', // need to compose validators if we use more than one
        Validators.compose([
          CustomValidators.integerValidator,
          Validators.min(1)
        ])
      ],
      courseLeader: [ '' ],
      method: '',
      gradeLevel: '',
      subjectLevel: '',
      startDate: [ '', CustomValidators.dateValidator ],
      endDate: [
        '',
        Validators.compose([
          // we are using a higher order function so we  need to call the validator function
          CustomValidators.endDateValidator(),
          CustomValidators.dateValidator
        ])
      ],
      day: this.fb.array([]),
      startTime: [ '', CustomValidators.timeValidator ],
      endTime: [
        '',
        Validators.compose([
          CustomValidators.endTimeValidator(),
          CustomValidators.timeValidator
        ])
      ],
      location: '',
      backgroundColor: [ '', CustomValidators.hexValidator ],
      foregroundColor: [ '', CustomValidators.hexValidator ]
    });

    // set default values
    this.courseForm.patchValue({
      gradeLevel: this.gradeLevels[0],
      subjectLevel: this.subjectLevels[0],
      memberLimit: 10,
      backgroundColor: '#ffffff',
      foregroundColor: '#000000'
    });
  }

  // Add a conditional to check routeparams, if 'update' make get request and patch the values
  ngOnInit() {
    console.log('This is ActivatedRoute', this.route);
    // console.log(this.route.snapshot.paramMap.get('id'))
    console.log(this.route.snapshot.url[0].path);

    if (this.route.snapshot.url[0].path === 'update') {
      this.couchService.get('courses/' + this.route.snapshot.paramMap.get('id'))
      .subscribe((data) => {
        console.log(data);
        this.courseForm.patchValue(data);
      }, (error) => {
        console.log(error);
      });
    }
  }

  updateCourse(data) {
    // this is next
  }

  onSubmit() {
    if (this.courseForm.valid) {
      if (this.route.snapshot.url[0].path === 'update') {
        this.updateCourse(this.courseForm.value);
      } else {
        this.addCourse(this.courseForm.value);
      }
    } else {
      Object.keys(this.courseForm.controls).forEach(field => {
        const control = this.courseForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  addCourse(courseInfo) {
    // ...is the rest syntax for object destructuring
    this.couchService.post(this.dbName, { ...courseInfo }).subscribe(() => {
      this.router.navigate([ '/courses' ]);
      this.planetMessageService.showMessage('New Course Added');
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  cancel() {
    this.router.navigate([ '/courses' ]);
  }

  /* FOR TOGGLING DAILY/WEEKLY DAYS */

  onDayChange(day: string, isChecked: boolean) {
    const dayFormArray = <FormArray>this.courseForm.controls.day;

    if (isChecked) {
      // add to day array if checked
      dayFormArray.push(new FormControl(day));
    } else {
      // remove from day array if unchecked
      const index = dayFormArray.controls.findIndex(x => x.value === day);
      dayFormArray.removeAt(index);
    }
  }

  // remove old values from array on radio button change
  toogleWeekly(val: boolean) {
    // empty the array
    this.courseForm.setControl('day', this.fb.array([]));
    if (val) {
      // add all days to the array if the course is daily
      this.courseForm.setControl('day', this.fb.array(this.days));
    }
    this.showDaysCheckBox = val;
  }
}
