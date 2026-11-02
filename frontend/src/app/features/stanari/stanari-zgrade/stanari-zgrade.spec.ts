import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StanariZgrade } from './stanari-zgrade';

describe('StanariZgrade', () => {
  let component: StanariZgrade;
  let fixture: ComponentFixture<StanariZgrade>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StanariZgrade],
    }).compileComponents();

    fixture = TestBed.createComponent(StanariZgrade);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
