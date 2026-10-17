import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PotvrdaKvara } from './potvrda-kvara';

describe('PotvrdaKvara', () => {
  let component: PotvrdaKvara;
  let fixture: ComponentFixture<PotvrdaKvara>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PotvrdaKvara],
    }).compileComponents();

    fixture = TestBed.createComponent(PotvrdaKvara);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
