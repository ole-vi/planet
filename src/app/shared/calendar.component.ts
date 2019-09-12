import { Component, Input, OnInit } from '@angular/core';
import { OptionsInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import { MatDialog } from '@angular/material';
import { DialogsAddMeetupsComponent } from './dialogs/dialogs-add-meetups.component';
import { CouchService } from './couchdb.service';
import { findDocuments } from './mangoQueries';

@Component({
  selector: 'planet-calendar',
  template: `
    <full-calendar
      defaultView="dayGridMonth"
      [events]="events"
      [plugins]="calendarPlugins"
      [firstDay]="6"
      [header]="header"
      [customButtons]="buttons"
      (eventClick)="eventClick($event)">
    </full-calendar>
  `
})
export class PlanetCalendarComponent implements OnInit {

  @Input() link: any = {};
  options: OptionsInput;
  calendarPlugins = [ dayGridPlugin ];
  header = {
    left: 'title',
    center: '',
    right: 'addEventButton today prev,next'
  };
  buttons = {
    addEventButton: {
      text: 'Add Event',
      click: this.openAddEventDialog.bind(this)
    }
  };
  dbName = 'meetups';
  events: any[] = [];

  constructor(
    private dialog: MatDialog,
    private couchService: CouchService
  ) {}

  ngOnInit() {
    this.getMeetups();
  }

  getMeetups() {
    this.couchService.findAll(this.dbName, findDocuments({ link: this.link })).subscribe((meetups: any[]) => {
      this.events = meetups.map(meetup => ({
        title: meetup.title,
        start: new Date(meetup.startDate + (Date.parse('1970-01-01T' + meetup.startTime + 'Z') || 0)),
        end: new Date(meetup.endDate + (Date.parse('1970-01-01T' + meetup.endTime + 'Z') || 0)),
        allDay: meetup.startTime === undefined || meetup.startTime === '',
        editable: true,
        extendedProps: { meetup }
      }));
    });
  }

  openAddEventDialog() {
    this.dialog.open(DialogsAddMeetupsComponent, { data: { link: this.link, onMeetupsChange: this.onMeetupsChange.bind(this) } });
  }

  onMeetupsChange() {
    this.getMeetups();
  }

  eventClick({ event }) {
    console.log(event);
    this.dialog.open(DialogsAddMeetupsComponent, { data: {
      meetup: event.extendedProps.meetup, view: 'view', link: this.link, onMeetupsChange: this.onMeetupsChange.bind(this)
    } });
  }

}
