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
import { CoursesService } from '../courses.service';

@Component({
  templateUrl: 'courses-add.component.html',
  styleUrls: [ './courses-add.scss' ]
})
export class CoursesAddComponent implements OnInit {
  // needs member document to implement
  members = [];
  readonly dbName = 'courses'; // make database name a constant
  courseForm: FormGroup;
  documentInfo = { rev: '', id: '' };
  pageType = 'Add new';
  steps = [];

  // from the constants import
  gradeLevels = constants.gradeLevels;
  subjectLevels = constants.subjectLevels;

  mockStep = { stepTitle: 'Add title', description: '!!!' };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private couchService: CouchService,
    private validatorService: ValidatorService,
    private planetMessageService: PlanetMessageService,
    private coursesService: CoursesService
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
        10, // need to compose validators if we use more than one
        Validators.compose([
          CustomValidators.integerValidator,
          Validators.min(1)
        ])
      ],
      courseLeader: [ '' ],
      method: '',
      gradeLevel: this.gradeLevels[0],
      subjectLevel: this.subjectLevels[0],
      createdDate: Date.now()
    });
  }

  ngOnInit() {
    const storedCourse = this.coursesService.course;
    if (this.route.snapshot.url[0].path === 'update') {
      this.couchService.get('courses/' + this.route.snapshot.paramMap.get('id'))
      .subscribe((data) => {
        this.pageType = 'Update';
        this.documentInfo = { rev: data._rev, id: data._id };
        if (!storedCourse.form) {
          this.setFormAndSteps({ form: data, steps: data.steps });
        }
      }, (error) => {
        console.log(error);
      });
    }
    if (storedCourse.form) {
      this.setFormAndSteps(storedCourse);
    }
  }

  setFormAndSteps(course: any) {
    this.courseForm.patchValue(course.form);
    this.steps = course.steps || [];
  }

  updateCourse(courseInfo) {
    this.couchService.put(
      this.dbName + '/' + this.documentInfo.id,
      { ...courseInfo, '_rev': this.documentInfo.rev, steps: this.steps }
    ).subscribe(() => {
      this.navigateBack();
      this.planetMessageService.showMessage('Course Updated Successfully');
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
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
    this.couchService.post(this.dbName, { ...courseInfo, steps: this.steps }).subscribe(() => {
      this.navigateBack();
      this.planetMessageService.showMessage('New Course Added');
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  addStep() {
    this.steps.push({
      stepTitle: '',
      description: '',
      attachment: ''
    });
  }

  navigateBack() {
    this.coursesService.reset();
    this.router.navigate([ '/courses' ]);
  }

  addExam(stepIndex) {
    this.coursesService.returnUrl = this.router.url;
    this.coursesService.course = { form: this.courseForm.value, steps: this.steps };
    this.coursesService.stepIndex = stepIndex;
    this.router.navigate([ '/courses/exam' ]);
  }

  removeStep(pos) {
    this.steps.splice(pos, 1);
  }

  orderStep(oldPos, newPos) {
    const tempStep = this.steps[oldPos];
    this.steps.splice(oldPos, 1);
    this.steps.splice(newPos, 0, tempStep);
  }

  stepTrackByFn(index, item) {
    return index;
  }

}
