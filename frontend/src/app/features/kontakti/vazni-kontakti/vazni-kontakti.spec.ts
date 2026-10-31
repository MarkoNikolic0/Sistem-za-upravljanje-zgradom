import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VazniKontakti } from './vazni-kontakti';

describe('VazniKontakti', () => {
  let component: VazniKontakti;
  let fixture: ComponentFixture<VazniKontakti>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VazniKontakti],
    }).compileComponents();

    fixture = TestBed.createComponent(VazniKontakti);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
