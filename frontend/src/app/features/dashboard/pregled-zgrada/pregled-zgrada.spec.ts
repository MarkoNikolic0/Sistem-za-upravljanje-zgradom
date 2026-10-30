import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PregledZgrada } from './pregled-zgrada';

describe('PregledZgrada', () => {
  let component: PregledZgrada;
  let fixture: ComponentFixture<PregledZgrada>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PregledZgrada],
    }).compileComponents();

    fixture = TestBed.createComponent(PregledZgrada);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
