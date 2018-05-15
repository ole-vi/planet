import { Component, OnInit } from '@angular/core';
import { CouchService } from '../../shared/couchdb.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import * as constants from '../constants';
import { CustomValidators } from '../../validators/custom-validators';
import { UserService } from '../../shared/user.service';

@Component({
  templateUrl: './meetups-add.component.html'
})

export class MeetupsAddComponent implements OnInit {
  message = '';
  meetupForm: FormGroup;
  readonly dbName = 'meetups'; // database name constant
  categories = constants.categories;
  pageType = 'Add new';
  revision = null;
  id = null;
  showDaysCheckBox = true; // for toggling the days checkbox
  days = constants.days;
  meetupFrequency = [];
  radio = '';

  constructor(
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private userService: UserService
  ) {
    this.createForm();
  }

  ngOnInit() {

    if (this.route.snapshot.url[0].path === 'update') {
      this.couchService.get('meetups/' + this.route.snapshot.paramMap.get('id'))
      .subscribe((data) => {
        this.pageType = 'Update';
        this.revision = data._rev;
        this.id = data._id;
        this.meetupFrequency = data.day || [];
        this.meetupForm.patchValue(data);
        this.radio = data.recurring;
        this.radio === 'weekly' ? (this.showDaysCheckBox = false) && (this.meetupForm.value.day.concat(this.meetupFrequency))
          : (this.showDaysCheckBox = true) && (this.meetupFrequency = []);
      }, (error) => {
        console.log(error);
      });
    }
  }

  createForm() {
    this.meetupForm = this.fb.group({
      title: [ '', Validators.required ],
      description: [ '', Validators.required ],
      startDate: [ '',
      Validators.compose([
        CustomValidators.dateValidator,
        CustomValidators.notDateInPast
        ])
      ],
      endDate: [
        '',
        Validators.compose([
          // we are using a higher order function so we  need to call the validator function
          CustomValidators.endDateValidator(),
          CustomValidators.dateValidator
        ])
      ],
      recurring: '',
      day: this.fb.array([]),
      startTime: [ '', CustomValidators.timeValidator ],
      endTime: [
        '',
        Validators.compose([
          CustomValidators.endTimeValidator(),
          CustomValidators.timeValidator
        ])
      ],
      category: '',
      meetupLocation: '',
      createdBy: this.userService.get().name,
      createdDate: Date.now()
    });
  }

  onSubmit() {
    if (this.meetupForm.valid) {
      if (this.meetupForm.value.recurring  === 'daily') {
        this.meetupForm.value.day = this.days;
      } else if (this.meetupForm.value.recurring  === 'weekly') {
        this.meetupForm.value.day = this.meetupFrequency;
      }
      if (this.route.snapshot.url[0].path === 'update') {
        this.updateMeetup(this.meetupForm.value);
      } else {
        this.addMeetup(this.meetupForm.value);
      }
    } else {
      Object.keys(this.meetupForm.controls).forEach(field => {
        const control = this.meetupForm.get(field);
        control.markAsTouched({ onlySelf: true });
      });
    }
  }

  updateMeetup(meetupeInfo) {
    this.couchService.put(this.dbName + '/' + this.id, { ...meetupeInfo, '_rev': this.revision }).subscribe(() => {
      this.router.navigate([ '/meetups' ]);
      this.planetMessageService.showMessage('Meetup Updated Successfully');
    }, (err) => {
      // Connect to an error display component to show user that an error has occurred
      console.log(err);
    });
  }

  addMeetup(meetupInfo) {
    this.couchService.post(this.dbName, { ...meetupInfo }).subscribe(() => {
      this.router.navigate([ '/meetups' ]);
      this.planetMessageService.showMessage('Meetup created');
    }, (err) => console.log(err));
  }

  cancel() {
    this.router.navigate([ '/meetups' ]);
  }

  isClassDay(day) {
    return this.meetupFrequency.includes(day) ? true : false;
  }

  onDayChange(day: string, isChecked: boolean) {
    if (isChecked) {
      // add to day array if checked
      if (!this.meetupFrequency.includes(day)) {
        this.meetupFrequency.push(day);
      }
    } else {
      // remove from day array if unchecked
      const index = this.meetupFrequency.findIndex(x => x.value === day);
      this.meetupFrequency.splice(index);
    }
  }

  toggleDaily(val) {
    val ? this.showDaysCheckBox = val : this.showDaysCheckBox = val;
  }

}
