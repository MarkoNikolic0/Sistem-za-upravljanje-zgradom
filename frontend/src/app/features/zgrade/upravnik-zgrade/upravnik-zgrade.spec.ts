import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UpravnikZgrade } from './upravnik-zgrade';

describe('UpravnikZgrade', () => {
  let component: UpravnikZgrade;
  let fixture: ComponentFixture<UpravnikZgrade>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpravnikZgrade],
    }).compileComponents();

    fixture = TestBed.createComponent(UpravnikZgrade);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
