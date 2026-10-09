import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListaKvarova } from './lista-kvarova';

describe('ListaKvarova', () => {
  let component: ListaKvarova;
  let fixture: ComponentFixture<ListaKvarova>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaKvarova],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaKvarova);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
