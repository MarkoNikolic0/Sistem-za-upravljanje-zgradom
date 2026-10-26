import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KarticaGlasanja } from './kartica-glasanja';

describe('KarticaGlasanja', () => {
  let component: KarticaGlasanja;
  let fixture: ComponentFixture<KarticaGlasanja>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KarticaGlasanja],
    }).compileComponents();

    fixture = TestBed.createComponent(KarticaGlasanja);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
