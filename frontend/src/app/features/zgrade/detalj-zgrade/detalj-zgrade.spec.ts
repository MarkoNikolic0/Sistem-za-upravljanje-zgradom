import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetaljZgrade } from './detalj-zgrade';

describe('DetaljZgrade', () => {
  let component: DetaljZgrade;
  let fixture: ComponentFixture<DetaljZgrade>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetaljZgrade],
    }).compileComponents();

    fixture = TestBed.createComponent(DetaljZgrade);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
