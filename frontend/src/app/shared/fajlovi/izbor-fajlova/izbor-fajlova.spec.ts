import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IzborFajlova } from './izbor-fajlova';

describe('IzborFajlova', () => {
  let component: IzborFajlova;
  let fixture: ComponentFixture<IzborFajlova>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IzborFajlova],
    }).compileComponents();

    fixture = TestBed.createComponent(IzborFajlova);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
