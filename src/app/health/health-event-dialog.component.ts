import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { conditionAndTreatmentFields, vitals } from './health.constants';
import { Router } from '@angular/router';
import { UsersService } from '../users/users.service';

@Component({
  templateUrl: './health-event-dialog.component.html'
})
export class HealthEventDialogComponent implements OnInit {

  event: any;
  hasConditionAndTreatment = false;
  conditionAndTreatmentFields = conditionAndTreatmentFields;
  conditions: string;
  hasVital = false;
  canUpdate: any;
  performedBy = '';
  minutes: string;
  seconds: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private router: Router,
    private usersService: UsersService
  ) {
    this.event = this.data.event || {};
    this.canUpdate = (new Date(Date.now()).getTime() - new Date(this.event.date).getTime()) <= 300000,
    this.conditions = Object.entries(this.event.conditions || {})
      .filter(([ condition, active ]) => active).map(([ condition, active ]) => condition).sort().join(', ');
    this.hasConditionAndTreatment = this.event.hasInfo !== undefined ?
      this.event.hasInfo === true :
      this.conditionAndTreatmentFields.some(field => this.event[field] !== '');
    this.hasVital = vitals.some(vital => this.event[vital]);
    this.timer();
  }

  ngOnInit() {
    this.usersService.usersListener(true).subscribe(users => {
      const user = users.find(u => u._id === this.event.createdBy);
      this.performedBy = user.fullName;
    });
    if (!this.event.selfExamination) {
      this.usersService.requestUsers();
    }
  }

  editExam(event) {
    this.router.navigate([ 'event', { id: this.data.user, eventId: event._id } ], { relativeTo: this.data.route });
  }

  timer() {
    const intervalId = setInterval(() => {
      const time = (300000 - (new Date(Date.now()).getTime() - new Date(this.event.date).getTime())) / 1000;
      if (time >= 0) {
        const minutes = Math.floor(time / 60).toString();
        let seconds = Math.floor(time % 60).toString();
        seconds = parseInt(seconds, 10) < 10 ? '0' + seconds : seconds;
        this.minutes = minutes;
        this.seconds = seconds;
      } else {
        clearInterval(intervalId);
      }
    }, 1000);
  }
}
