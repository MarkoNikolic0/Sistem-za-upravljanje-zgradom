import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KarticaAnkete } from './kartica-ankete';

describe('KarticaAnkete', () => {
  let component: KarticaAnkete;
  let fixture: ComponentFixture<KarticaAnkete>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KarticaAnkete],
    }).compileComponents();

    fixture = TestBed.createComponent(KarticaAnkete);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
