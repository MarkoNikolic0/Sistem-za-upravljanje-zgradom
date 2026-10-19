import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IzborSlika } from './izbor-slika';

describe('IzborSlika', () => {
  let component: IzborSlika;
  let fixture: ComponentFixture<IzborSlika>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IzborSlika],
    }).compileComponents();

    fixture = TestBed.createComponent(IzborSlika);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
