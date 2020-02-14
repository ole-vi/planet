import { Component, Input, Output, EventEmitter, ViewChild, ChangeDetectorRef, AfterViewChecked, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StateService } from '../shared/state.service';

@Component({
  selector: 'planet-news-list-item',
  templateUrl: 'news-list-item.component.html',
  styleUrls: [ './news-list-item.scss' ]
})
export class NewsListItemComponent implements OnInit, AfterViewChecked {

  @Input() item;
  @Input() replyObject;
  @Input() showRepliesButton = true;
  @Input() editable = true;
  @Input() shareTarget: 'community' | 'nation' | 'center';
  @Output() changeReplyViewing = new EventEmitter<any>();
  @Output() updateNews = new EventEmitter<any>();
  @Output() deleteNews = new EventEmitter<any>();
  @Output() shareNews = new EventEmitter<{ news: any, local: boolean }>();
  @Output() addLabel = new EventEmitter<{ label: string, news: any }>();
  @ViewChild('content', { static: false }) content;
  contentHeight = 0;
  currentUser = this.userService.get();
  showLess = true;
  showShare = false;
  planetCode = this.stateService.configuration.code;
  targetLocalPlanet = true;
  labels = [ 'help' ];

  constructor(
    private router: Router,
    private userService: UserService,
    private couchService: CouchService,
    private cdRef: ChangeDetectorRef,
    private notificationsService: NotificationsService,
    private stateService: StateService
  ) {}

  ngOnInit() {
    const configuration = this.stateService.configuration;
    this.targetLocalPlanet = this.shareTarget === this.stateService.configuration.planetType;
    this.showShare = this.shareTarget &&
      (!this.targetLocalPlanet ||
      (this.item.viewIn || []).every(({ _id }) => _id !== `${configuration.code}@${configuration.parentCode}`));
  }

  ngAfterViewChecked() {
    const offsetHeight = this.content && this.content.nativeElement.children[0].children[0].children[0].offsetHeight;
    if (offsetHeight && offsetHeight !== this.contentHeight) {
      this.contentHeight = offsetHeight;
      this.cdRef.detectChanges();
    }
  }

  remToPx(rem) {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
  }

  addReply(news) {
    const label = this.formLabel(news);
    this.updateNews.emit({
      title: `Reply to ${label}`,
      placeholder: `Your ${label}`,
      initialValue: '',
      news: {
        replyTo: news._id,
        messagePlanetCode: news.messagePlanetCode,
        messageType: news.messageType
      }
    });
    this.sendNewsNotifications(news);
  }

  sendNewsNotifications(news: any = '') {
    const replyBy = this.currentUser.name;
    const userId = news.user._id;
    const link = this.router.url;
    const notification = {
      user: userId,
      'message': `<b>${replyBy}</b> replied to your ${news.viewableBy === 'community' ? 'community ' : ''}message.`,
      link,
      'priority': 1,
      'type': 'replyMessage',
      'replyTo': news._id,
      'status': 'unread',
      'time': this.couchService.datePlaceholder,
    };
    return this.notificationsService.sendNotificationToUser(notification).subscribe();
  }

  editNews(news) {
    const label = this.formLabel(news);
    this.updateNews.emit({
      title: `Edit ${label}`,
      placeholder: `Your ${label}`,
      initialValue: news.message,
      news
    });
  }

  formLabel(news) {
    return news.viewableBy === 'teams' ? 'Message' : 'Story';
  }

  showReplies(news) {
    this.changeReplyViewing.emit(news);
  }

  openDeleteDialog(news) {
    this.deleteNews.emit(news);
  }

  shareStory(news) {
    this.shareNews.emit({ news, local: this.targetLocalPlanet });
  }

  labelClick(label) {
    this.addLabel.emit({ label, news: this.item });
  }

}

@Component({
  selector: 'planet-news-label',
  template: `<ng-container i18n>{ label, select, help {Help Wanted} }</ng-container>`
})
export class NewsLabelComponent {

  @Input() label: string;

}
