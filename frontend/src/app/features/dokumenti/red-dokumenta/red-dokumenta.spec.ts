import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RedDokumenta } from './red-dokumenta';

describe('RedDokumenta', () => {
  let component: RedDokumenta;
  let fixture: ComponentFixture<RedDokumenta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RedDokumenta],
    }).compileComponents();

    fixture = TestBed.createComponent(RedDokumenta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
