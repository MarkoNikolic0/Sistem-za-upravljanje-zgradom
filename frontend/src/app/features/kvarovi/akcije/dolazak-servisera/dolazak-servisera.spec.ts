import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DolazakServisera } from './dolazak-servisera';

describe('DolazakServisera', () => {
  let component: DolazakServisera;
  let fixture: ComponentFixture<DolazakServisera>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DolazakServisera],
    }).compileComponents();

    fixture = TestBed.createComponent(DolazakServisera);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
