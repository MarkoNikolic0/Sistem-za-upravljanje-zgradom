import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProveriMejl } from './proveri-mejl';

describe('ProveriMejl', () => {
  let component: ProveriMejl;
  let fixture: ComponentFixture<ProveriMejl>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProveriMejl],
    }).compileComponents();

    fixture = TestBed.createComponent(ProveriMejl);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
