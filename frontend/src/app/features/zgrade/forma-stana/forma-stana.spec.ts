import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormaStana } from './forma-stana';

describe('FormaStana', () => {
  let component: FormaStana;
  let fixture: ComponentFixture<FormaStana>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormaStana],
    }).compileComponents();

    fixture = TestBed.createComponent(FormaStana);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
