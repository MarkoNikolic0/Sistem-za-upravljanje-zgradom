import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PotvrdaEmaila } from './potvrda-emaila';

describe('PotvrdaEmaila', () => {
  let component: PotvrdaEmaila;
  let fixture: ComponentFixture<PotvrdaEmaila>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PotvrdaEmaila],
    }).compileComponents();

    fixture = TestBed.createComponent(PotvrdaEmaila);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
