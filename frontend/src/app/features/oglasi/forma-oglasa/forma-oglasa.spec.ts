import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormaOglasa } from './forma-oglasa';

describe('FormaOglasa', () => {
  let component: FormaOglasa;
  let fixture: ComponentFixture<FormaOglasa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormaOglasa],
    }).compileComponents();

    fixture = TestBed.createComponent(FormaOglasa);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
