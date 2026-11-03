import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListaZgrada } from './lista-zgrada';

describe('ListaZgrada', () => {
  let component: ListaZgrada;
  let fixture: ComponentFixture<ListaZgrada>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaZgrada],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaZgrada);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
