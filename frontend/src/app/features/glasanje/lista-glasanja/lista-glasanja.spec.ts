import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListaGlasanja } from './lista-glasanja';

describe('ListaGlasanja', () => {
  let component: ListaGlasanja;
  let fixture: ComponentFixture<ListaGlasanja>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaGlasanja],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaGlasanja);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
