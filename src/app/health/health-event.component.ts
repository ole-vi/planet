import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HealthService } from './health.service';
import { conditions, conditionAndTreatmentFields } from './health.constants';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';
import { CustomValidators } from '../validators/custom-validators';
import { MatDialog, MatDialogRef } from '@angular/material';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { of } from 'rxjs';

@Component({
  templateUrl: './health-event.component.html',
  styleUrls: [ './health-update.scss' ]
})
export class HealthEventComponent implements OnInit {

  healthForm: FormGroup;
  conditions = conditions;
  dialogPrompt: MatDialogRef<DialogsPromptComponent>;
  eventDoc: [];
  event: any;

  constructor(
    private fb: FormBuilder,
    private healthService: HealthService,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private stateService: StateService,
    private dialog: MatDialog
  ) {
    this.healthForm = this.fb.group({
      temperature: [ '', Validators.min(1) ],
      pulse: [ '', Validators.min(1) ],
      bp: [ '', CustomValidators.bpValidator ],
      height: [ '', Validators.min(1) ],
      weight: [ '', Validators.min(1) ],
      vision: [ '' ],
      hearing: [ '' ],
      notes: '',
      diagnosis: '',
      treatments: '',
      medications: '',
      immunizations: '',
      allergies: '',
      xrays: '',
      tests: '',
      referrals: '',
      conditions: {}
    });
  }

  ngOnInit() {
    this.healthService.shareEventDetail.subscribe((data: any) => {
      this.event = data.events.find(e => e.date.toString() === data.eventDate);
      (this.event._id ?
        this.healthService.getHealthData(data.userDetail._id, { docId: this.event._id })
        : of([ this.event ])
      ).subscribe(([ eventDoc ]) => this.healthForm.patchValue(eventDoc));
    });
  }

  onSubmit() {
    if (!this.healthForm.valid) {
      return;
    }
    const checkFields = [ 'temperature', 'pulse', 'bp', 'height', 'weight' ];
    const promptFields = checkFields.filter((field) => !this.isFieldValueExpected(field))
      .map(field => ({ field, value: this.healthForm.controls[field].value }));
    if (promptFields.length) {
      this.showWarning(promptFields);
    } else {
      this.saveEvent().subscribe(() => this.goBack());
    }
  }

  isEmptyForm() {
    const isConditionsEmpty = (values) => typeof values === 'object' && Object.values(values).every(value => !value);
    return Object.values(this.healthForm.controls).every(({ value }) => value === '' || value === null || isConditionsEmpty(value));
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route });
  }

  conditionChange(condition) {
    const currentConditions = this.healthForm.controls.conditions.value;
    this.healthForm.controls.conditions.setValue({ ...currentConditions, [condition]: currentConditions[condition] !== true });
  }

  showWarning(invalidFields) {
    this.dialogPrompt = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: {
          request: this.saveEvent(),
          onNext: (data) => {
            this.dialogPrompt.close();
            this.goBack();
          }
        },
        showMainParagraph: false,
        extraMessage: 'The following measurement(s) may be incorrect. Click <b>Cancel</b> to fix or click <b>OK</b> to submit.',
        showLabels: invalidFields
      }
    });
  }

  isFieldValueExpected(field) {
    const value = this.healthForm.controls[field].value;
    const limits = {
      'temperature': { min: 30, max: 40 },
      'pulse': { min: 40, max: 120 },
      'height': { min: 1, max: 250 },
      'weight': { min: 1, max: 150 },
      'bp': 'n/a'
    };
    if (value === null || value === '' || !limits[field]) {
      return true;
    }
    if (field === 'bp') {
      return /^(([6-9])(\d)|([1-2])(\d){2}|(300))\/(([4-9])(\d)|(1)(\d){2}|(200))$/.test(value);
    }
    return value >= limits[field].min && value <= limits[field].max;
  }

  saveEvent() {
    return this.healthService.addEvent(
      this.route.snapshot.params.id,
      this.userService.get()._id,
      {
        ...this.healthForm.value,
        date: this.event._id ? this.event.id : Date.now(),
        updatedDate: this.event._id ? Date.now() : '',
        selfExamination: this.route.snapshot.params.id === this.userService.get()._id,
        createdBy: this.userService.get()._id,
        planetCode: this.stateService.configuration.code,
        hasInfo: conditionAndTreatmentFields.some(key => this.healthForm.value[key] !== '')
      }
    );
  }

}
