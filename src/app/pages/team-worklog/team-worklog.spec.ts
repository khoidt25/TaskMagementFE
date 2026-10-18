import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeamWorklog } from './team-worklog';

describe('TeamWorklog', () => {
  let component: TeamWorklog;
  let fixture: ComponentFixture<TeamWorklog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamWorklog],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamWorklog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
