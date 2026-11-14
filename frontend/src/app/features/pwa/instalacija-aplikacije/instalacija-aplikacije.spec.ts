import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstalacijaAplikacije } from './instalacija-aplikacije';

describe('InstalacijaAplikacije', () => {
  let component: InstalacijaAplikacije;
  let fixture: ComponentFixture<InstalacijaAplikacije>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstalacijaAplikacije],
    }).compileComponents();

    fixture = TestBed.createComponent(InstalacijaAplikacije);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
