import { Component, Input, Output, EventEmitter, ViewChild, ChangeDetectorRef, AfterViewChecked } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { findDocuments } from '../shared/mangoQueries';

@Component({
  selector: 'planet-news-list-item',
  templateUrl: 'news-list-item.component.html',
  styleUrls: [ './news-list-item.scss' ]
})
export class NewsListItemComponent implements AfterViewChecked {

  @Input() item;
  @Input() replyObject;
  @Input() showRepliesButton = true;
  @Output() changeReplyViewing = new EventEmitter<any>();
  @Output() updateNews = new EventEmitter<any>();
  @Output() deleteNews = new EventEmitter<any>();
  @ViewChild('content', { static: false }) content;
  contentHeight = 0;
  currentUser = this.userService.get();
  showLess = true;

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private cdRef: ChangeDetectorRef
  ) {}

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

  sendNewsNotifications(news) {
    const replyBy = this.currentUser.name;
    const userId = news.user._id;
    const link = news.viewableBy;
    const notification = {
      user: userId,
      'message': `${replyBy} replyed to your community message.`,
      link,
      'priority': 1,
      'type': 'replyMessage',
      'replyTo': news._id,
      'status': 'unread',
      'time': this.couchService.datePlaceholder,
    };
    return this.couchService.findAll(
      'notifications',
      findDocuments({ link, type: 'replyMessage', status: 'unread', user: news.user._id })
    ).pipe(
      switchMap((data: any[]) => data.length === 0 ? this.couchService.updateDocument('notifications', notification) : of({}))
    ).subscribe();
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

}
