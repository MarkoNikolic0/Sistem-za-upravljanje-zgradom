import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PozivObavestenja } from './poziv-obavestenja';

describe('PozivObavestenja', () => {
  let component: PozivObavestenja;
  let fixture: ComponentFixture<PozivObavestenja>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PozivObavestenja],
    }).compileComponents();

    fixture = TestBed.createComponent(PozivObavestenja);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
