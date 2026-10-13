import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardMemberComponent } from './dashboard-member.component';

describe('DashboardMemberComponent', () => {
  let component: DashboardMemberComponent;
  let fixture: ComponentFixture<DashboardMemberComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardMemberComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardMemberComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
