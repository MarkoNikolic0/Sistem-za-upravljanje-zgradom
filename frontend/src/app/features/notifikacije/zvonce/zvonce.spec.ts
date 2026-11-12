import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Zvonce } from './zvonce';

describe('Zvonce', () => {
  let component: Zvonce;
  let fixture: ComponentFixture<Zvonce>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Zvonce],
    }).compileComponents();

    fixture = TestBed.createComponent(Zvonce);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
