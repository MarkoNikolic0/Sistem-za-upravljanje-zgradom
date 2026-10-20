import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PracenjeKvara } from './pracenje-kvara';

describe('PracenjeKvara', () => {
  let component: PracenjeKvara;
  let fixture: ComponentFixture<PracenjeKvara>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PracenjeKvara],
    }).compileComponents();

    fixture = TestBed.createComponent(PracenjeKvara);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
