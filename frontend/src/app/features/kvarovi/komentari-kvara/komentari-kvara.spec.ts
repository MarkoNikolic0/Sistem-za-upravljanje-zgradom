import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KomentariKvara } from './komentari-kvara';

describe('KomentariKvara', () => {
  let component: KomentariKvara;
  let fixture: ComponentFixture<KomentariKvara>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KomentariKvara],
    }).compileComponents();

    fixture = TestBed.createComponent(KomentariKvara);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
