import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Paginacija } from './paginacija';

describe('Paginacija', () => {
  let component: Paginacija;
  let fixture: ComponentFixture<Paginacija>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Paginacija],
    }).compileComponents();

    fixture = TestBed.createComponent(Paginacija);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
