import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StanoviZgrade } from './stanovi-zgrade';

describe('StanoviZgrade', () => {
  let component: StanoviZgrade;
  let fixture: ComponentFixture<StanoviZgrade>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StanoviZgrade],
    }).compileComponents();

    fixture = TestBed.createComponent(StanoviZgrade);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
