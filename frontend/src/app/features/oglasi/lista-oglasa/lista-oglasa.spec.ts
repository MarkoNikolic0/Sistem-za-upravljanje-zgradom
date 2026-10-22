import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListaOglasa } from './lista-oglasa';

describe('ListaOglasa', () => {
  let component: ListaOglasa;
  let fixture: ComponentFixture<ListaOglasa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaOglasa],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaOglasa);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
