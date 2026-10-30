import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Danas } from './danas';

describe('Danas', () => {
  let component: Danas;
  let fixture: ComponentFixture<Danas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Danas],
    }).compileComponents();

    fixture = TestBed.createComponent(Danas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
