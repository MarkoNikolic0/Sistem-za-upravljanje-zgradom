import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KorisniciSistema } from './korisnici-sistema';

describe('KorisniciSistema', () => {
  let component: KorisniciSistema;
  let fixture: ComponentFixture<KorisniciSistema>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KorisniciSistema],
    }).compileComponents();

    fixture = TestBed.createComponent(KorisniciSistema);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
