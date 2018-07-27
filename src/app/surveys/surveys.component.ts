import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatTableDataSource, MatSort, MatPaginator, MatDialog, MatDialogRef } from '@angular/material';
import { CouchService } from '../shared/couchdb.service';
import { filterSpecificFields } from '../shared/table-helpers';
import { DialogsListService } from '../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../shared/dialogs/dialogs-list.component';
import { SubmissionsService } from '../submissions/submissions.service';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  'templateUrl': './surveys.component.html'
})
export class SurveysComponent implements OnInit, AfterViewInit {

  surveys = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  displayedColumns = [ 'name', 'action' ];
  dialogRef: MatDialogRef<DialogsListComponent>;

  constructor(
    private couchService: CouchService,
    private dialogsListService: DialogsListService,
    private submissionsService: SubmissionsService,
    private planetMessageService: PlanetMessageService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.surveys.filterPredicate = filterSpecificFields([ 'name' ]);
    this.getSurveys().subscribe((surveys) => {
      this.surveys.data = surveys;
    });
  }

  ngAfterViewInit() {
    this.surveys.sort = this.sort;
    this.surveys.paginator = this.paginator;
  }

  getSurveys() {
    return this.couchService.findAll('exams', { 'selector': { 'type': 'surveys' } });
  }

  goBack() {
    this.router.navigate([ '/manager' ]);
  }

  routeToEditSurvey(route, id = '') {
    this.router.navigate([ route + '/' + id, { 'type': 'surveys' } ], { relativeTo: this.route });
  }

  applyFilter(filterValue: string) {
    this.surveys.filter = filterValue;
  }

  openSendSurveyDialog(survey) {
    this.dialogsListService.getListAndColumns('_users').subscribe(response => {
      this.dialogRef = this.dialog.open(DialogsListComponent, {
        data: { ...response, allowMulti: true, okClick: this.sendSurvey(survey).bind(this) },
        height: '500px',
        width: '600px',
        autoFocus: false
      });
    });
  }

  sendSurvey(survey: any) {
    return (selectedUsers: string[]) => {
      this.submissionsService.sendSubmissionRequests(selectedUsers, {
        'parentId': survey._id, 'parent': survey }
      ).subscribe(() => {
        this.planetMessageService.showMessage('Survey requests sent');
        this.dialogRef.close();
      });
    };
  }

}
