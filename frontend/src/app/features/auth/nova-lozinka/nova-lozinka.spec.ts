import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NovaLozinka } from './nova-lozinka';

describe('NovaLozinka', () => {
  let component: NovaLozinka;
  let fixture: ComponentFixture<NovaLozinka>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NovaLozinka],
    }).compileComponents();

    fixture = TestBed.createComponent(NovaLozinka);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
