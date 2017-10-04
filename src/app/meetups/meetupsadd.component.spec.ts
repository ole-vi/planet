import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { CouchService } from '../shared/couchdb.service';
import { MeetupsaddComponent } from './meetupsadd.component';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';


describe('MeetupsaddComponent', () => {
  
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ FormsModule, HttpModule ],
      declarations: [ MeetupsaddComponent ],
      providers:[CouchService]
    })
    .compileComponents();
  }));

  let component: MeetupsaddComponent;
  let fixture: ComponentFixture<MeetupsaddComponent>;
  let spy:any;
  let couchService;
  let testModel;
  let de;
  let statusElement;
  let compiled;

  beforeEach(() => {
     fixture = TestBed.createComponent(MeetupsaddComponent);
     component = fixture.debugElement.componentInstance;
     couchService = fixture.debugElement.injector.get(CouchService);
     testModel = { title:'hangout', description:'once a week' };
     de = fixture.debugElement;
     compiled = fixture.debugElement.nativeElement;
     statusElement = de.nativeElement.querySelector('p');
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  
  it('should make a post request to couchService', () => {
    spy = spyOn(couchService, 'post').and.returnValue(Promise.resolve(testModel));
    component.onSubmit(testModel);
    fixture.whenStable().then(() => {
        fixture.detectChanges();
        expect(spy).toHaveBeenCalled();
    });
  });
  
  it('should show meetup created: title correctly',() =>{
      
      spy = spyOn(couchService, 'post').and.returnValue(Promise.resolve(testModel.title));
      component.onSubmit(testModel);
      fixture.whenStable().then(() =>{
          fixture.detectChanges();
          expect(statusElement.textContent).toBe('Meetup created: ' + testModel.title);
      });
  });

  it('should message Please complete the form',() =>{
      testModel.title='';
      testModel.description='';
      component.onSubmit(testModel);
      fixture.whenStable().then(()=>{
        fixture.detectChanges();
        expect(statusElement.textContent).toBe('Please complete the form');
    });
  });
  
  it('should message There was a problem creating the meetup',() =>{
    
      spy = spyOn(couchService, 'post').and.returnValue(Promise.reject({}));
      component.onSubmit(testModel);
      fixture.whenStable().then(() =>{
          fixture.detectChanges();
          let compiled = fixture.debugElement.nativeElement;
          expect(statusElement.textContent).toBe('There was a problem creating the meetup');
      });
  });
})