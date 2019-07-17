import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { UserService } from '../shared/user.service';

@Component({
  selector: 'planet-news-list-item',
  templateUrl: 'news-list-item.component.html',
  styleUrls: [ './news-list-item.scss' ]
})
export class NewsListItemComponent {

  @Input() item;
  @Input() replyObject;
  @Input() showRepliesButton = true;
  @Output() changeReplyViewing = new EventEmitter<any>();
  @Output() updateNews = new EventEmitter<any>();
  @Output() deleteNews = new EventEmitter<any>();
  @ViewChild('content') content;
  contentHeight = 0;
  currentUser = this.userService.get();
  showLess = true;

  constructor(
    private userService: UserService
  ) {}

  ngAfterViewChecked() {
    if (this.content) {
      this.contentHeight = this.content.nativeElement.children[0].children[0].offsetHeight;
    }
  }

  remToPx(rem) {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
  }

  addReply(news) {
    this.updateNews.emit({
      title: 'Reply to Post',
      placeholder: 'Your Story',
      initialValue: '',
      news: {
        replyTo: news._id,
        messagePlanetCode: news.messagePlanetCode,
        messageType: news.messageType
      }
    });
  }

  editNews(news) {
    this.updateNews.emit({
      title: 'Edit Post',
      placeholder: 'Your Story',
      initialValue: news.message,
      news
    });
  }

  showReplies(news) {
    this.changeReplyViewing.emit(news);
  }

  openDeleteDialog(news) {
    this.deleteNews.emit(news);
  }

}
