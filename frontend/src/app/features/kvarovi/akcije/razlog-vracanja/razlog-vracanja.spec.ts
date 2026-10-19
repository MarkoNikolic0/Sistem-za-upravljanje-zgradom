import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RazlogVracanja } from './razlog-vracanja';

describe('RazlogVracanja', () => {
  let component: RazlogVracanja;
  let fixture: ComponentFixture<RazlogVracanja>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RazlogVracanja],
    }).compileComponents();

    fixture = TestBed.createComponent(RazlogVracanja);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
