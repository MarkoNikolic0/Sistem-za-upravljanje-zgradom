import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrakaKvoruma } from './traka-kvoruma';

describe('TrakaKvoruma', () => {
  let component: TrakaKvoruma;
  let fixture: ComponentFixture<TrakaKvoruma>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrakaKvoruma],
    }).compileComponents();

    fixture = TestBed.createComponent(TrakaKvoruma);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
