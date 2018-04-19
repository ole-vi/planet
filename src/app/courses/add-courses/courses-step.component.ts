import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators
} from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material';
import { DialogsListService } from '../../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../../shared/dialogs/dialogs-list.component';

@Component({
  selector: 'planet-courses-step',
  templateUrl: 'courses-step.component.html'
})
export class CoursesStepComponent implements OnInit {

  @Input() stepInfo: any = {
    stepTitle: '',
    description: '',
    attachment: ''
  };
  @Output() stepInfoChange = new EventEmitter<any>();
  @Input() stepNum: number;
  @Output() stepRemove = new EventEmitter<any>();
  stepForm: FormGroup;
  dialogRef: MatDialogRef<DialogsListComponent>;
  attachment: any;

  constructor(
    private fb: FormBuilder,
    private dialogsListService: DialogsListService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.stepForm = this.fb.group(this.stepInfo);
    this.attachment = this.stepForm.controls.attachment.value;
  }

  stepChange() {
    this.stepInfoChange.emit(this.stepForm.value);
  }

  deleteStep() {
    this.stepRemove.emit();
  }

  attachItem(db: string) {
    this.dialogsListService.getListAndColumns(db).subscribe((res) => {
      const data = { okClick: this.dialogOkClick(db).bind(this), ...res };
      this.dialogRef = this.dialog.open(DialogsListComponent, {
        data: data
      });
    });
  }

  dialogOkClick(db: string) {
    return (item: any) => {
      this.stepForm.patchValue({ attachment: { doc: item, type: db } });
      this.stepChange();
      this.dialogRef.close();
    };
  }

}
