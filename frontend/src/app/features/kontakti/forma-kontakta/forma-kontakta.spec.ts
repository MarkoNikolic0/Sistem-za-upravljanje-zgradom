import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormaKontakta } from './forma-kontakta';

describe('FormaKontakta', () => {
  let component: FormaKontakta;
  let fixture: ComponentFixture<FormaKontakta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormaKontakta],
    }).compileComponents();

    fixture = TestBed.createComponent(FormaKontakta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
