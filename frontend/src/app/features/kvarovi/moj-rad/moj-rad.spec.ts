import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MojRad } from './moj-rad';

describe('MojRad', () => {
  let component: MojRad;
  let fixture: ComponentFixture<MojRad>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MojRad],
    }).compileComponents();

    fixture = TestBed.createComponent(MojRad);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
