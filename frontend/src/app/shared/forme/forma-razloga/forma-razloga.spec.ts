import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormaRazloga } from './forma-razloga';

describe('FormaRazloga', () => {
  let component: FormaRazloga;
  let fixture: ComponentFixture<FormaRazloga>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormaRazloga],
    }).compileComponents();

    fixture = TestBed.createComponent(FormaRazloga);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
