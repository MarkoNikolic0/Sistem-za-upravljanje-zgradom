import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ZahteviUpravnika } from './zahtevi-upravnika';

describe('ZahteviUpravnika', () => {
  let component: ZahteviUpravnika;
  let fixture: ComponentFixture<ZahteviUpravnika>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZahteviUpravnika],
    }).compileComponents();

    fixture = TestBed.createComponent(ZahteviUpravnika);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
