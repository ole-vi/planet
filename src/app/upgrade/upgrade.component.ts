import { Component, ViewEncapsulation } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CouchService } from '../shared/couchdb.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { UserService } from '../shared/user.service';

@Component({
  templateUrl: './upgrade.component.html',
  styleUrls: [ './upgrade.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class UpgradeComponent {
  enabled: Boolean = true;
  message = 'Start upgrade';
  output = '';
  working: Boolean = false;
  done: Boolean = false;
  error: Boolean = false;
  cleanOutput = '';
  timeoutTrials = 0;

  constructor(private http: HttpClient, private couchService: CouchService, private userService: UserService) {
    this.addLine('Not started');
  }

  start() {
    this.enabled = false;
    this.message = 'Upgrading';
    this.working = true;
    this.addLine('Server request started');
    this.upgrade();

    this.timeoutTrials += 1;
  }

  upgrade() {
    this.getParentVersion().subscribe((parentVersion: string) => {
      const requestParams = new HttpParams().set('v', parentVersion.trim());

      this.http.get(environment.upgradeAddress, { responseType: 'text', params: requestParams })
        .subscribe(result => {
          result.split('\n').forEach(line => {
            if (line.includes('timeout')) {
              this.addLine(line, 'upgrade_timeout');
              return;
            }

            this.addLine(line, 'upgrade_success');
          });

          if (result.includes('timeout')) {
            this.handleTimeout();
            return;
          }

          this.message = 'Success';
          this.error = false;
          this.done = true;
        }, err => {
          this.handleError(err);
        });
    }, err => {
      this.handleError(err);
    });
  }

  getDateTime() {
    const date = new Date();
    const d = ('0' + date.getDate()).slice(-2);
    const M = ('0' + date.getMonth()).slice(-2);
    const Y = date.getFullYear();
    const h = ('0' + date.getHours()).slice(-2);
    const m = ('0' + date.getMinutes()).slice(-2);
    const s = ('0' + date.getSeconds()).slice(-2);
    return `[${d}/${M}/${Y} ${h}:${m}:${s}]`;
  }

  addLine(string, cssClass?) {
    if (!string.length) { return; }
    string = string.trim();
    const dTime = this.getDateTime();
    const start = `<span class=\'${cssClass}\'>`;
    this.output += `${start}${dTime} ${string}</span>\n`;
    this.cleanOutput += `${dTime} ${string}\n`;
  }

  handleTimeout() {
    this.message = 'Retry';
    this.error = false;
    this.done = false;
    this.enabled = true;
    this.working = false;

    if (this.timeoutTrials >= 5) {
      this.addLine('Request timed-out', 'upgrade_timeout');
      this.addLine('Request timed-out 5 times. Please try again later.', 'upgrade_error');
      this.enabled = false;
      this.error = true;
      this.done = true;
    } else {
      this.addLine('Request timed-out, try again.', 'upgrade_timeout');
    }
  }

  handleError(err) {
    this.addLine('An error ocurred:', 'upgrade_error');
    JSON.stringify(err, null, 1).split('\n').forEach(line => {
      this.addLine(line, 'upgrade_error');
    });
    this.working = false;
    this.message = 'Start upgrade';
    this.error = true;
    this.done = true;
  }

  getParentVersion() {
    const opts = {
      domain: this.userService.getConfig().parentDomain,
      responseType: 'text',
      withCredentials: false,
      headers: { 'Content-Type': 'text/plain' }
    };
    return this.couchService.getUrl('version', opts).pipe(catchError(() => of('N/A')));
  }
}
