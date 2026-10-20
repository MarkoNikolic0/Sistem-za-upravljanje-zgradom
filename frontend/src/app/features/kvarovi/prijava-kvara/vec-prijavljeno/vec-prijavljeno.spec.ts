import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VecPrijavljeno } from './vec-prijavljeno';

describe('VecPrijavljeno', () => {
  let component: VecPrijavljeno;
  let fixture: ComponentFixture<VecPrijavljeno>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VecPrijavljeno],
    }).compileComponents();

    fixture = TestBed.createComponent(VecPrijavljeno);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
