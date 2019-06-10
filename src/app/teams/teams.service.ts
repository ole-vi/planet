import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { dedupeShelfReduce } from '../shared/utils';
import { UserService } from '../shared/user.service';
import { of, empty, config } from 'rxjs';
import { switchMap, map, takeWhile, catchError } from 'rxjs/operators';
import { debug } from '../debug-operator';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { Validators } from '@angular/forms';
import { findDocuments } from '../shared/mangoQueries';
import { CustomValidators } from '../validators/custom-validators';
import { StateService } from '../shared/state.service';

const addTeamDialogFields = [ {
  'type': 'textbox',
  'name': 'name',
  'placeholder': 'Name',
  'required': true
}, {
  'type': 'textarea',
  'name': 'description',
  'placeholder': 'Detail',
  'required': false
} ];

@Injectable()
export class TeamsService {

  dbName = 'teams';

  constructor(
    private couchService: CouchService,
    private dialogsFormService: DialogsFormService,
    private userService: UserService,
    private stateService: StateService
  ) {}

  addTeamDialog(userId: string, team?) {
    const configuration = this.stateService.configuration;
    const title = team ? 'Update Team' : 'Create Team';
    const formGroup = {
      name: [ team ? team.name : '', CustomValidators.required ],
      description: team ? team.description : '',
      requests: [ team ? team.requests : [] ],
      teamType: [ team ? { value: team.teamType || 'local', disabled: true } : 'local' ]
    };
    return this.dialogsFormService
      .confirm(title, [ ...addTeamDialogFields, this.typeFormField(configuration) ], formGroup)
      .pipe(
        debug('Dialog confirm'),
        switchMap((response: any) => {
          if (response !== undefined) {
            return this.updateTeam(
              { limit: 12, status: 'active', createdDate: this.couchService.datePlaceholder, teamPlanetCode: configuration.code,
                parentCode: configuration.parentCode, ...team, ...response }
            );
          }
          return empty();
        }),
        switchMap((response) => {
          if (!team) {
            return this.toggleTeamMembership(response, false, { userId, userPlanetCode: configuration.code });
          }
          return of(response);
        })
      );
  }

  typeFormField(configuration) {
    return {
      'type': 'selectbox',
      'name': 'teamType',
      'placeholder': 'Team Type',
      'options': [
        { 'value': 'sync', 'name': configuration.planetType === 'community' ? 'Sync with nation' : 'Sync with earth' },
        { 'value': 'local', 'name': 'Local team' }
      ]
    };
  }

  updateTeam(team: any) {
    return this.couchService.updateDocument(this.dbName, team).pipe(switchMap((res: any) => {
      return of({ ...team, _rev: res.rev, _id: res.id });
    }));
  }

  requestToJoinTeam(team, userId) {
    const userPlanetCode = this.stateService.configuration.code;
    return this.couchService.post(this.dbName, this.membershipProps(team, { userId, userPlanetCode }, 'request'));
  }

  removeFromRequests(team, memberInfo) {
    return this.couchService.findAll(this.dbName, findDocuments(this.membershipProps(team, memberInfo, 'request'))).pipe(
      switchMap((docs: any[]) => this.couchService.bulkDocs(this.dbName, docs.map(doc => ({ ...doc, _deleted: true }))))
    );
  }

  toggleTeamMembership(team, leaveTeam, memberInfo) {
    return this.updateMembershipDoc(team, leaveTeam, memberInfo).pipe(
      switchMap(() => leaveTeam ? this.isTeamEmpty(team) : of(team)),
      switchMap((isEmpty) => isEmpty === true ? this.updateTeam({ ...team, status: 'archived' }) : of(team)),
      switchMap((newTeam) => of({ ...team, ...newTeam }))
    );
  }

  updateMembershipDoc(team, leaveTeam, memberInfo) {
    const deleted = leaveTeam ? { _deleted: true } : {};
    const membershipProps = this.membershipProps(team, memberInfo, 'membership');
    return this.couchService.findAll(this.dbName, findDocuments(membershipProps)).pipe(
      map((docs) => docs.length === 0 ? [ membershipProps ] : docs),
      switchMap((membershipDocs: any[]) => this.couchService.bulkDocs(
        this.dbName, membershipDocs.map(membershipDoc => ({ ...membershipDoc, ...deleted }))
      ))
    );
  }

  membershipProps(team, memberInfo, docType) {
    const { userId, userPlanetCode } = memberInfo;
    const { _id: teamId, teamPlanetCode, teamType } = team;
    return {
      teamId, userId, teamPlanetCode, teamType, userPlanetCode, docType
    };
  }

  getTeamMembers(team, withRequests = false) {
    const typeObj = withRequests ? {} : { docType: 'membership' };
    return this.couchService.findAll(this.dbName, findDocuments({ teamId: team._id, teamPlanetCode: team.teamPlanetCode, ...typeObj }));
  }

  isTeamEmpty(team) {
    return this.getTeamMembers(team).pipe(map((docs) => docs.length === 0));
  }

  sendNotifications(type, members, notificationParams) {
    const notifications = members.filter((user: any) => {
      return this.userService.get().name !== user.name && user.name !== 'satellite';
    }).map((user: any) => this.teamNotification(this.teamNotificationMessage(type, notificationParams), user._id, notificationParams));
    return this.couchService.updateDocument('notifications/_bulk_docs', { docs: notifications });
  }

  teamNotificationMessage(type, { team, newMembersLength = '' }) {
    switch (type) {
      case 'message':
        return `<b>${this.userService.get().name}</b> has posted a message on <b>"${team.name}"</b> team.`;
      case 'request':
        return `<b>${this.userService.get().name}</b> has requested to join <b>"${team.name}"</b> team.`;
      case 'added':
        return `You have been added to <b>"${team.name}"</b> team.`;
      default:
        return `${newMembersLength} member(s) has been added to <b>${team.name}</b> team.`;
    }
  }

  teamNotification(message, userId, { team, url }) {
    return {
      'user': userId,
      message,
      'link': url,
      'item': team._id,
      'type': 'team',
      'priority': 1,
      'status': 'unread',
      'time': this.couchService.datePlaceholder
    };
  }

}
