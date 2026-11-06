import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DokumentiZgrade } from './dokumenti-zgrade';

describe('DokumentiZgrade', () => {
  let component: DokumentiZgrade;
  let fixture: ComponentFixture<DokumentiZgrade>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DokumentiZgrade],
    }).compileComponents();

    fixture = TestBed.createComponent(DokumentiZgrade);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
