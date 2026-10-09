import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetaljKvara } from './detalj-kvara';

describe('DetaljKvara', () => {
  let component: DetaljKvara;
  let fixture: ComponentFixture<DetaljKvara>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetaljKvara],
    }).compileComponents();

    fixture = TestBed.createComponent(DetaljKvara);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
