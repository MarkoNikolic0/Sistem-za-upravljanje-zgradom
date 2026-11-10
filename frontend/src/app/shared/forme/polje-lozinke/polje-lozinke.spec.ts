import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PoljeLozinke } from './polje-lozinke';

describe('PoljeLozinke', () => {
  let component: PoljeLozinke;
  let fixture: ComponentFixture<PoljeLozinke>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoljeLozinke],
    }).compileComponents();

    fixture = TestBed.createComponent(PoljeLozinke);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
