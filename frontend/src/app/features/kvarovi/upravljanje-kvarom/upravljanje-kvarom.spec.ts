import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UpravljanjeKvarom } from './upravljanje-kvarom';

describe('UpravljanjeKvarom', () => {
  let component: UpravljanjeKvarom;
  let fixture: ComponentFixture<UpravljanjeKvarom>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpravljanjeKvarom],
    }).compileComponents();

    fixture = TestBed.createComponent(UpravljanjeKvarom);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
