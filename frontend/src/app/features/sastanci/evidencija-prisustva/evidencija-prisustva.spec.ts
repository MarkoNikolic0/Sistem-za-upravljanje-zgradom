import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvidencijaPrisustva } from './evidencija-prisustva';

describe('EvidencijaPrisustva', () => {
  let component: EvidencijaPrisustva;
  let fixture: ComponentFixture<EvidencijaPrisustva>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvidencijaPrisustva],
    }).compileComponents();

    fixture = TestBed.createComponent(EvidencijaPrisustva);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
