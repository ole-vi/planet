import { Component, Input, EventEmitter, Output } from '@angular/core';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';

@Component({
  selector: 'planet-teams-member',
  templateUrl: './teams-member.component.html',
})
export class TeamsMemberComponent {

  @Input() member: any;
  @Input() actionMenu: ('remove' | 'leader' | 'title')[];
  @Input() visits: { [_id: string]: number };
  @Input() userStatus = '';
  @Input() teamLeader;
  @Output() actionClick = new EventEmitter<any>();
  user = this.userService.get();
  planetCode = this.stateService.configuration.planetCode;

  constructor(
    private userService: UserService,
    private stateService: StateService
  ) {}

  openDialog(actionParams: { member, change: 'remove' | 'leader' | 'title' }) {
    this.actionClick.emit(actionParams);
  }

}
