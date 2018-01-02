import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { environment } from '../../../environments/environment';
import { UserService } from '../../shared/user.service';

@Component({
  templateUrl: './user-profile.component.html'
})
export class UserProfileComponent implements OnInit {
  private dbName = '_users';
  userDetail = [];
  imageSrc = '';
  urlPrefix = environment.couchAddress + this.dbName + '/';
  name = '';
  urlName = '';

  constructor(
    private couchService: CouchService,
    private route: ActivatedRoute,
    private userService: UserService
  ) { }

  ngOnInit() {
    Object.assign(this, this.userService.get());
    this.profileView();
  }

  profileView() {
    this.urlName = this.route.snapshot.paramMap.get('name');
    this.couchService.get(this.dbName + '/org.couchdb.user:' + this.urlName).subscribe((response) => {
      this.userDetail = response;
      if (response['_attachments']) {
        const filename = Object.keys(response._attachments)[0];
        this.imageSrc = this.urlPrefix + '/org.couchdb.user:' + this.urlName + '/' + filename;
      } else {
        this.imageSrc = 'https://openclipart.org/image/2400px/svg_to_png/202776/pawn.png';
      }
    }, (error) => {
      console.log(error);
    });
  }
}
