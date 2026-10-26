import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StanjeOdluke } from './stanje-odluke';

describe('StanjeOdluke', () => {
  let component: StanjeOdluke;
  let fixture: ComponentFixture<StanjeOdluke>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StanjeOdluke],
    }).compileComponents();

    fixture = TestBed.createComponent(StanjeOdluke);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
