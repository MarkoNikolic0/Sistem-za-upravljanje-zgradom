import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RazlogPromene } from './razlog-promene';

describe('RazlogPromene', () => {
  let component: RazlogPromene;
  let fixture: ComponentFixture<RazlogPromene>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RazlogPromene],
    }).compileComponents();

    fixture = TestBed.createComponent(RazlogPromene);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
