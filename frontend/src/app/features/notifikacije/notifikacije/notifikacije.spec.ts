import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Notifikacije } from './notifikacije';

describe('Notifikacije', () => {
  let component: Notifikacije;
  let fixture: ComponentFixture<Notifikacije>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Notifikacije],
    }).compileComponents();

    fixture = TestBed.createComponent(Notifikacije);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
