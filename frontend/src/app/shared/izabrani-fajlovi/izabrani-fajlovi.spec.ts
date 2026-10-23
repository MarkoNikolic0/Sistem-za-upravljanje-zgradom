import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IzabraniFajlovi } from './izabrani-fajlovi';

describe('IzabraniFajlovi', () => {
  let component: IzabraniFajlovi;
  let fixture: ComponentFixture<IzabraniFajlovi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IzabraniFajlovi],
    }).compileComponents();

    fixture = TestBed.createComponent(IzabraniFajlovi);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
