import { Component, Inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { TagsService } from './tags.service';
import { PlanetMessageService } from '../planet-message.service';
import { ValidatorService } from '../../validators/validator.service';

@Component({
  'templateUrl': 'planet-tag-input-dialog.component.html'
})
export class PlanetTagInputDialogComponent {

  tags: any[] = [];
  selected = new Map(this.data.tags.map(value => [ value, false ] as [ string, boolean ]));
  filterValue = '';
  mode = 'filter';
  selectMany = false;
  addTagForm: FormGroup;
  newTagId: string;

  constructor(
    public dialogRef: MatDialogRef<PlanetTagInputDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private tagsService: TagsService,
    private fb: FormBuilder,
    private planetMessageService: PlanetMessageService,
    private validatorService: ValidatorService
  ) {
    this.dataInit();
    this.selectMany = this.mode === 'add';
    this.data.startingTags
      .filter((tag: string) => tag)
      .forEach(tag => this.tagChange({ value: [ tag.name ], selected: true }));
    this.addTagForm = this.fb.group({
      name: [ '', Validators.required, ac => this.validatorService.isUnique$('tags', 'name', ac) ],
      attachedTo: [ [] ]
    });
  }

  dataInit() {
    this.tags = this.data.tags;
    this.mode = this.data.mode;
    if (this.newTagId !== undefined) {
      this.tagChange({ value: this.newTagId, selected: true });
      this.newTagId = undefined;
    }
  }

  tagChange(option) {
    const tags = option.value;
    tags.forEach((tag, index) => {
      if (index === 0 || option.selected) {
        this.selected.set(tag, option.selected);
        this.data.tagUpdate(tag, this.selected.get(tag));
      }
    });
  }

  isSelected(tag: string) {
    return this.selected.get(tag);
  }

  updateFilter(value) {
    this.tags = value ? this.tagsService.filterTags(this.data.tags, value) : this.data.tags;
  }

  selectOne(tag, subTag?) {
    this.data.tagUpdate(tag, true, true);
    if (subTag !== undefined) {
      this.data.tagUpdate(subTag, true);
    }
    this.dialogRef.close();
  }

  addLabel() {
    const onAllFormControls = (func: any) => Object.entries(this.addTagForm.controls).forEach(func);
    if (this.addTagForm.valid) {
      this.tagsService.newTag(this.addTagForm.value).subscribe((res) => {
        this.newTagId = res.id;
        this.planetMessageService.showMessage('New label added');
        onAllFormControls(([ key, value ]) => value.updateValueAndValidity());
        this.data.initTags();
      });
    } else {
      onAllFormControls(([ key, value ]) => value.markAsTouched({ onlySelf: true }));
    }
  }

}
