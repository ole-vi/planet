import {
  Component, Input, Optional, Self, OnDestroy, HostBinding, EventEmitter, Output, OnInit, ViewEncapsulation, ElementRef, DoCheck, ViewChild
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { MatFormFieldControl, MatDialog } from '@angular/material';
import { Subject } from 'rxjs';
import { FocusMonitor } from '@angular/cdk/a11y';
import { DialogsImagesComponent } from '../dialogs/dialogs-images.component';

interface ImageInfo { resourceId: string, filename: string, url: string };

@Component({
  'selector': 'planet-markdown-textbox',
  'templateUrl': './planet-markdown-textbox.component.html',
  'styleUrls': [ 'planet-markdown-textbox.scss' ],
  'providers': [
    { provide: MatFormFieldControl, useExisting: PlanetMarkdownTextboxComponent },
  ],
  'encapsulation': ViewEncapsulation.None
})
export class PlanetMarkdownTextboxComponent implements ControlValueAccessor, DoCheck, OnInit, OnDestroy {

  static nextId = 0;

  @HostBinding() id = `planet-markdown-textbox-${PlanetMarkdownTextboxComponent.nextId++}`;
  @HostBinding('attr.aria-describedby') describedBy = '';
  @ViewChild('editor', { static: false }) editor;
  @Input() _value: { text: string, images: ImageInfo[] } = { text: '', images: [] };
  get value() {
    return this._value;
  }
  set value(newValue: { text: string, images: ImageInfo[] }) {
    this._value = newValue || { text: '', images: [] };
    this.onChange(this._value);
    this.stateChanges.next();
  }
  @Output() valueChanges = new EventEmitter<string[]>();

  get empty() {
    return this._value.text.length === 0;
  }

  private _placeholder: string;
  @Input()
  get placeholder() {
    return this._placeholder;
  }
  set placeholder(text: string) {
    this._placeholder = text;
    this.stateChanges.next();
  }

  @Input()
  get required(): boolean { return this._required; }
  set required(value: boolean) {
    this._required = value;
    this.stateChanges.next();
  }
  private _required = false;

  get shouldLabelFloat() {
    return true;
  }

  @Input() imageGroup: 'community' | { [db: string]: string };
  onTouched;
  stateChanges = new Subject<void>();
  focused = false;
  errorState = false;
  options: any = { hideIcons: [ 'image' ] };

  constructor(
    @Optional() @Self() public ngControl: NgControl,
    private focusMonitor: FocusMonitor,
    private elementRef: ElementRef,
    private dialog: MatDialog
  ) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
    focusMonitor.monitor(elementRef.nativeElement, true).subscribe(origin => {
      this.focused = !!origin;
      this.stateChanges.next();
    });
  }

  ngDoCheck() {
    this.checkHighlight();
  }

  ngOnInit() {
    const imageToolbarIcon = {
      name: 'custom',
      action: this.addImage.bind(this),
      className: 'fa fa-picture-o',
      title: 'Add Image'
    };
    this.options = {
      ...this.options,
      ...(this.imageGroup ?
        {
          toolbar: [
            'bold', 'italic', 'heading', '|',
            'quote', 'unordered-list', 'ordered-list', '|',
            'link', imageToolbarIcon, '|',
            'preview', 'side-by-side', 'fullscreen', '|',
            'guide'
          ]
        } :
        {}
      )
    };
  }

  ngOnDestroy() {
    this.stateChanges.complete();
  }

  writeValue(val: string) {
    this.value = { ...this.value, text: val };
    this.setErrorState();
  }

  onChange(_: any) {}

  registerOnChange(fn: (_: any) => void) {
    this.onChange = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  setDescribedByIds(ids: string[]) {
    this.describedBy = ids.join(' ');
  }

  setErrorState() {
    this.errorState = this.ngControl.touched && this.value.text === '';
  }

  onFocusOut() {
    this.ngControl.control.markAsTouched({ onlySelf: true });
    this.setErrorState();
  }

  checkHighlight() {
    if (this.ngControl.touched && this.ngControl.valid !== true) {
      this.errorState = true;
      this.value.text = '';
    } else {
      this.errorState = false;
    }
  }

  addImage() {
    this.dialog.open(DialogsImagesComponent, {
      width: '500px',
      data: {
        imageGroup: this.imageGroup
      }
    }).afterClosed().subscribe(image => {
      if (image) {
        const url = `resources/${image._id}/${encodeURI(image.filename)}`;
        this.editor.options.insertTexts.image = [ `![](${url}` , ')' ];
        this.editor._simpleMDE.drawImage();
        this.value = { ...this.value, images: [ ...this._value.images, { resourceId: image._id, filename: image.filename, url } ] };
      }
    });
  }

}
