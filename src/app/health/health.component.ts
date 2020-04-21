import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { MatTableDataSource, MatDialog } from '@angular/material';
import { UserService } from '../shared/user.service';
import { HealthService } from './health.service';
import { HealthEventDialogComponent } from './health-event-dialog.component';
import { environment } from '../../environments/environment';
import { takeUntil, switchMap } from 'rxjs/operators';
import { Subject, of } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { conditionAndTreatmentFields, conditions } from './health.constants';

@Component({
  templateUrl: './health.component.html',
  styleUrls: [ './health.scss' ]
})
export class HealthComponent implements OnInit, AfterViewChecked, OnDestroy {

  @ViewChild('examsTable', { static: false }) examsTable: ElementRef;
  userDetail = this.userService.get();
  healthDetail: any = {};
  events: any[] = [];
  eventTable = new MatTableDataSource();
  displayedColumns: string[] = [];
  additionalInfo: any = {};
  imageSrc = '';
  urlPrefix = environment.couchAddress + '/_users/';
  initializeEvents = true;
  isOwnUser = true;
  onDestroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private healthService: HealthService,
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private couchService: CouchService
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(takeUntil(this.onDestroy$)).pipe(switchMap((params: ParamMap) => {
      const id = `org.couchdb.user:${params.get('id')}`;
      this.isOwnUser = params.get('id') === null || params.get('id') === this.userService.get().name;
      return params.get('id') ? this.couchService.get(`_users/${id}`) : of(this.userService.get());
    })).subscribe((user) => {
      this.userDetail = user;
      this.initData();
    });
  }

  ngAfterViewChecked() {
    if (this.initializeEvents === false || this.examsTable === undefined) {
      return;
    }
    this.initializeEvents = false;
    this.examsTable.nativeElement.scrollLeft = this.examsTable.nativeElement.scrollWidth - this.examsTable.nativeElement.clientWidth;
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  initData() {
    this.healthService.getHealthData(this.userDetail._id).subscribe(({ profile, events }) => {
      this.userDetail = { ...profile, ...this.userDetail };
      if (this.userDetail._attachments) {
        this.imageSrc = `${this.urlPrefix}/${this.userDetail._id}/${Object.keys(this.userDetail._attachments)[0]}`;
      }
      this.healthDetail = profile;
      this.events = events || [];
      this.setEventData();
    });
  }

  goBack() {
    if (this.router.url.indexOf('profile') === -1) {
      this.router.navigate([ '..' ], { relativeTo: this.route });
    } else {
      this.router.navigate([ '../../' ], { relativeTo: this.route });
    }
  }

  examClick(eventDate) {
    if (eventDate !== 'label') {
      this.dialog.open(HealthEventDialogComponent, {
        data: { event: this.events.find(event => event.date === +eventDate) },
        width: '50vw',
        maxHeight: '90vh'
      });
    }
  }

  setEventData() {
    this.eventTable.data = this.events
      .sort((a, b) => a.date - b.date)
      .reduce((eventRows, event) => eventRows.map(item => ({ ...item, [event.date]: event[item.label] })), [
        { label: 'temperature' }, { label: 'pulse' }, { label: 'bp' }, { label: 'height' },
        { label: 'weight' }, { label: 'vision' }, { label: 'hearing' }
      ]);
    this.additionalInfo = this.events.reduce((additionalInfo, event) => ({
      ...additionalInfo,
      [event.date]: {
        selfExamination: event.selfExamination,
        hasConditions: Object.entries(event.conditions).find(
          ([ key, value ]: [ string, string ]) => (conditions.indexOf(key) > -1)) !== undefined,
        hasInfo: Object.entries(event).find(
          ([ key, value ]: [ string, string ]) => (conditionAndTreatmentFields.indexOf(key) > -1) &&
          value !== ''
        ) !== undefined
      }
    }), {});
    this.displayedColumns = Object.keys(this.eventTable.data[0]);
  }

}
