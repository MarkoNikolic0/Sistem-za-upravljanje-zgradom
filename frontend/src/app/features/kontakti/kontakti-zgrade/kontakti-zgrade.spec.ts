import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KontaktiZgrade } from './kontakti-zgrade';

describe('KontaktiZgrade', () => {
  let component: KontaktiZgrade;
  let fixture: ComponentFixture<KontaktiZgrade>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KontaktiZgrade],
    }).compileComponents();

    fixture = TestBed.createComponent(KontaktiZgrade);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
