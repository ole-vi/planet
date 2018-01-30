import { Directive, HostListener } from '@angular/core';
import { UserService } from '../shared/user.service';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { Validators } from '@angular/forms';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';

export class Message {
  message: string;
  user: string;
  time: Number;
}
export class Feedback {
  type: string;
  priority: boolean;
  owner: string;
  title: string;
  openTime: Number;
  closeTime: Number;
  source: string;
  url: string;
  messages: Array<Message>;
}

@Directive({
  selector: '[planet-feedback]'
})
export class FeedbackDirective {
  message: string;

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private dialogsFormService: DialogsFormService
  ) {}

  addFeedback(post: any) {
    this.message = '';
    const user = this.userService.get().name,
      { message, ...feedbackInfo } = post,
      startingMessage: Message = { message, time: Date.now(), user },
      newFeedback: Feedback = { owner: user, ...feedbackInfo, openTime: Date.now(), messages: [ startingMessage ] };
    this.couchService.post('feedback/', newFeedback)
    .subscribe((data) => {
      this.message = 'Thank you, your feedback is submitted!';
    },
    (error) => {
      this.message = 'Error, your  feedback cannot be submitted';
    });
  }

  @HostListener('click')
  openFeedback() {
    const title = 'Feedback';
    const type = 'feedback';
    const fields = dialogFieldOptions;
    const formGroup = {
      priority: [ '', Validators.required ],
      type: [ '', Validators.required ],
      message: [ '', Validators.required ]
    };
    this.dialogsFormService
      .confirm(title, fields, formGroup)
      .debug('Dialog confirm')
      .subscribe((response) => {
        if (response !== undefined) {
          this.addFeedback(response);
        }
      });
  }

}

const dialogFieldOptions = [
  {
    'label': 'Is your feedback Urgent?',
    'type': 'radio',
    'name': 'priority',
    'options': [
      'Yes',
      'No',
    ],
    'required': true
  },
  {
    'label': 'Feedback Type:',
    'type': 'radio',
    'name': 'type',
    'options': [
      'Question',
      'Bug',
      'Suggestion',
    ],
    'required': true
  },
  {
    'type': 'textarea',
    'name': 'message',
    'placeholder': 'Your Feedback',
    'required': true
  }
];
