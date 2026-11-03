import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormaZgrade } from './forma-zgrade';

describe('FormaZgrade', () => {
  let component: FormaZgrade;
  let fixture: ComponentFixture<FormaZgrade>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormaZgrade],
    }).compileComponents();

    fixture = TestBed.createComponent(FormaZgrade);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
