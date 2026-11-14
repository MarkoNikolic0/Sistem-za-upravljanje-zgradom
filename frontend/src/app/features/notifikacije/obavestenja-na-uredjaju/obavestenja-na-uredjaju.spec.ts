import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObavestenjaNaUredjaju } from './obavestenja-na-uredjaju';

describe('ObavestenjaNaUredjaju', () => {
  let component: ObavestenjaNaUredjaju;
  let fixture: ComponentFixture<ObavestenjaNaUredjaju>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObavestenjaNaUredjaju],
    }).compileComponents();

    fixture = TestBed.createComponent(ObavestenjaNaUredjaju);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
