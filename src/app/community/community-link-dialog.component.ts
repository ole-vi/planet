import { Component, ViewChild, Inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatStepper, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { CustomValidators } from '../validators/custom-validators';
import { TeamsService } from '../teams/teams.service';

@Component({
  templateUrl: './community-link-dialog.component.html',
})
export class CommunityLinkDialogComponent {

  @ViewChild('linkStepper', { static: false }) linkStepper: MatStepper;
  selectedLink: { db, title, selector? };
  links: { db, title, selector? }[] = [
    { db: 'teams', title: 'Teams', selector: { type: 'team' } },
    { db: 'teams', title: 'Enterprises', selector: { type: 'enterprise' } }
  ];
  linkForm: FormGroup;

  constructor(
    private dialogRef: MatDialogRef<CommunityLinkDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private teamsService: TeamsService
  ) {
    this.linkForm = this.fb.group({
      title: [ '', CustomValidators.required ],
      route: [ '', CustomValidators.required ],
      linkId: '',
      linkType: ''
    });
  }

  teamSelect({ mode, teamId, teamType }) {
    this.linkForm.controls.route.setValue(this.teamsService.teamLinkRoute(mode, teamId));
    this.linkForm.controls.linkId.setValue(teamId);
    this.linkForm.controls.linkType.setValue(teamType);
    this.linkStepper.selected.completed = true;
    this.linkStepper.next();
  }

  linkStepperChange({ selectedIndex }) {
    if (selectedIndex === 0 && this.linkForm.pristine !== true) {
      this.linkForm.reset();
    }
  }

  linkSubmit() {
    this.teamsService.createServicesLink(this.linkForm.value).subscribe(() => {
      this.data.getLinks();
      this.dialogRef.close();
    });
  }

}
