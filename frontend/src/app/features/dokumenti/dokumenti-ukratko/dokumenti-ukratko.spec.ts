import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DokumentiUkratko } from './dokumenti-ukratko';

describe('DokumentiUkratko', () => {
  let component: DokumentiUkratko;
  let fixture: ComponentFixture<DokumentiUkratko>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DokumentiUkratko],
    }).compileComponents();

    fixture = TestBed.createComponent(DokumentiUkratko);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
