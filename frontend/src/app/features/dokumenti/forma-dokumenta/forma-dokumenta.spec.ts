import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormaDokumenta } from './forma-dokumenta';

describe('FormaDokumenta', () => {
  let component: FormaDokumenta;
  let fixture: ComponentFixture<FormaDokumenta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormaDokumenta],
    }).compileComponents();

    fixture = TestBed.createComponent(FormaDokumenta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
