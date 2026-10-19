import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SlikeKvara } from './slike-kvara';

describe('SlikeKvara', () => {
  let component: SlikeKvara;
  let fixture: ComponentFixture<SlikeKvara>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlikeKvara],
    }).compileComponents();

    fixture = TestBed.createComponent(SlikeKvara);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
