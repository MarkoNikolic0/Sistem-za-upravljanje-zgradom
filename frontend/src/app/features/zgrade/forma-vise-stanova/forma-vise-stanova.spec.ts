import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormaViseStanova } from './forma-vise-stanova';

describe('FormaViseStanova', () => {
  let component: FormaViseStanova;
  let fixture: ComponentFixture<FormaViseStanova>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormaViseStanova],
    }).compileComponents();

    fixture = TestBed.createComponent(FormaViseStanova);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
