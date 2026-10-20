import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PovlacenjeKvara } from './povlacenje-kvara';

describe('PovlacenjeKvara', () => {
  let component: PovlacenjeKvara;
  let fixture: ComponentFixture<PovlacenjeKvara>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PovlacenjeKvara],
    }).compileComponents();

    fixture = TestBed.createComponent(PovlacenjeKvara);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
