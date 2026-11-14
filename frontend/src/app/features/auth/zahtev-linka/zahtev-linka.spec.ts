import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ZahtevLinka } from './zahtev-linka';

describe('ZahtevLinka', () => {
  let component: ZahtevLinka;
  let fixture: ComponentFixture<ZahtevLinka>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZahtevLinka],
    }).compileComponents();

    fixture = TestBed.createComponent(ZahtevLinka);
    fixture.componentRef.setInput('vrsta', 'lozinka');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
