import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { StateService } from '../shared/state.service';
import { NewsService } from '../news/news.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { MatDialog } from '@angular/material';
import { CommunityLinkDialogComponent } from './community-link-dialog.component';
import { TeamsService } from '../teams/teams.service';

@Component({
  templateUrl: './community.component.html',
  styleUrls: [ './community.scss' ]
})
export class CommunityComponent implements OnInit, OnDestroy {

  configuration = this.stateService.configuration;
  teamId = `${this.stateService.configuration.code}@${this.stateService.configuration.parentCode}`;
  news: any[] = [];
  links: any[] = [];
  showNewsButton = true;
  onDestroy$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private stateService: StateService,
    private newsService: NewsService,
    private dialogsFormService: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService,
    private teamsService: TeamsService
  ) {}

  ngOnInit() {
    this.newsService.requestNews({ createdOn: this.configuration.code, viewableBy: 'community' });
    this.newsService.newsUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(news => this.news = news);
    this.getLinks();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  openAddMessageDialog(message = '') {
    this.dialogsFormService.openDialogsForm(
      'Add News',
      [ { name: 'message', placeholder: 'Message', type: 'markdown', required: true } ],
      { message },
      { autoFocus: true, onSubmit: this.postMessage.bind(this) }
    );
  }

  postMessage(message) {
    this.newsService.postNews({
      viewableBy: 'community',
      messageType: 'sync',
      messagePlanetCode: this.configuration.code,
      ...message
    }, 'Message has been posted successfully').pipe(
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe(() => this.dialogsFormService.closeDialogsForm());
  }

  getLinks() {
    this.teamsService.getTeamMembers(this.teamId, true).subscribe((links) => this.links = links);
  }

  openAddLinkDialog() {
    this.dialog.open(CommunityLinkDialogComponent, {
      width: '50vw',
      maxHeight: '90vh',
      data: { getLinks: this.getLinks.bind(this) }
    });
  }

  toggleShowButton(data) {
    this.showNewsButton = data._id === 'root';
  }

}
