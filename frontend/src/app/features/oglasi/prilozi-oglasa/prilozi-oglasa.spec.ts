import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PriloziOglasa } from './prilozi-oglasa';

describe('PriloziOglasa', () => {
  let component: PriloziOglasa;
  let fixture: ComponentFixture<PriloziOglasa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriloziOglasa],
    }).compileComponents();

    fixture = TestBed.createComponent(PriloziOglasa);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
