import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SlikePrijave } from './slike-prijave';

describe('SlikePrijave', () => {
  let component: SlikePrijave;
  let fixture: ComponentFixture<SlikePrijave>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlikePrijave],
    }).compileComponents();

    fixture = TestBed.createComponent(SlikePrijave);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
