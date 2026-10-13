
import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { finalize, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import {
  TaskMemberService,
  TaskMember,
  TaskStatus,MemberWorkLogRow
} from '../../services/task-member.service';

import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../sidebar/sidebar';

import { TaskWorkLogService,TaskWorkLog,TaskWorkLogRequest } from '../../services/task-work-log.service';
@Component({
  selector: 'app-member-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
  ],
  templateUrl: './dashboard-member.component.html',
  styleUrl: './dashboard-member.component.css'
})
export class DashboardMemberComponent implements OnInit {

  loading = false;
  errorMessage = '';
  successMessage = '';

  tasks: TaskMember[] = [];
  filteredTasks: TaskMember[] = [];

  savingId: number | null = null;

  userId: number | null = null;
  username = '';
  currentDate = new Date();

  keyword = '';
  selectedStatus = 'ALL';

  readonly statuses: {
    value: TaskStatus;
    label: string;
  }[] = [
    {
      value: 'NOT_STARTED',
      label: 'Chưa bắt đầu'
    },
    {
      value: 'IN_PROGRESS',
      label: 'Đang thực hiện'
    },
    {
      value: 'PENDING',
      label: 'Tạm hoãn'
    },
    {
      value: 'COMPLETED',
      label: 'Hoàn thành'
    },
    {
      value: 'CANCELLED',
      label: 'Đã hủy'
    }
  ];

  constructor(
    private taskMemberService: TaskMemberService,
    private authService: AuthService,
    private taskWorkLogService: TaskWorkLogService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}


  ngOnInit(): void {
    this.loadMemberDashboard();
  }

  loadMemberDashboard(): void {
    console.log('[Member Dashboard] Bắt đầu tải dữ liệu');

    this.errorMessage = '';
    this.successMessage = '';

    if (typeof window === 'undefined') {
      return;
    }

    const storedUserId = window.localStorage.getItem('userId');
    const parsedUserId = Number(storedUserId);

    if (
      !storedUserId ||
      !Number.isFinite(parsedUserId) ||
      parsedUserId <= 0
    ) {
      console.warn(
        '[Member Dashboard] Không tìm thấy userId hợp lệ'
      );

      this.tasks = [];
      this.filteredTasks = [];
      this.errorMessage =
        'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.';

      this.cdr.detectChanges();
      return;
    }

    this.userId = parsedUserId;

    this.loadTasks();
  }

  loadTasks(): void {
    if (this.userId === null) {
      return;
    }

    console.log(
      '[Member Dashboard] Đang tải công việc của user:',
      this.userId
    );

    this.loading = true;
    this.errorMessage = '';

    this.taskMemberService
      .getMyTasks(this.userId)
      .pipe(
        catchError(error => {
          console.error(
            '[API] getMyTasks:',
            error
          );

          this.errorMessage =
            error.error?.message ||
            'Không thể tải danh sách công việc. Vui lòng thử lại.';

          return of([]);
        }),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();

          console.log(
            '[Member Dashboard] Loading:',
            this.loading
          );
        })
      )
      .subscribe({
        next: data => {
          console.log(
            '[Member Dashboard] Nhận dữ liệu:',
            data
          );

          this.tasks = Array.isArray(data)
            ? data
            : [];

          this.applyFilters();

          this.loadWorkLogs();

          console.log(
            '[Member Dashboard] Tổng số công việc:',
            this.tasks.length
          );
        },
        error: error => {
          console.error(
            '[Member Dashboard] Lỗi tải dữ liệu:',
            error
          );

          this.errorMessage =
            'Đã xảy ra lỗi khi tải Dashboard thành viên.';
        }
      });
  }

  applyFilters(): void {
    const keyword = this.keyword
      .trim()
      .toLowerCase();

    this.filteredTasks = this.tasks.filter(task => {

      const matchesStatus =
        this.selectedStatus === 'ALL' ||
        task.status === this.selectedStatus;

      const matchesKeyword =
        !keyword ||
        (task.taskName ?? '')
          .toLowerCase()
          .includes(keyword) ||
        (task.taskCode ?? '')
          .toLowerCase()
          .includes(keyword) ||
        (task.assignedWork ?? '')
          .toLowerCase()
          .includes(keyword);

      return matchesStatus && matchesKeyword;
    });
  }

  onSearch(): void {
    this.applyFilters();
  }


onStatusChange(task?: TaskMember): void {

  if (!task) {
    this.applyFilters();
    return;
  }

  switch (task.status) {
    case 'NOT_STARTED':
      task.progress = 0;
      break;

    case 'IN_PROGRESS':
      if (task.progress == null || task.progress <= 0) {
        task.progress = 10;
      }
      break;

    case 'COMPLETED':
      task.progress = 100;
      break;

    case 'PENDING':
    case 'CANCELLED':
      break;
  }

  this.applyFilters();
}


  resetFilters(): void {
    this.keyword = '';
    this.selectedStatus = 'ALL';

    this.applyFilters();
  }

  get totalTasks(): number {
    return this.tasks.length;
  }

  get notStartedTasks(): number {
    return this.tasks.filter(
      task => task.status === 'NOT_STARTED'
    ).length;
  }

  get inProgressTasks(): number {
    return this.tasks.filter(
      task => task.status === 'IN_PROGRESS'
    ).length;
  }

  get pendingTasks(): number {
    return this.tasks.filter(
      task => task.status === 'PENDING'
    ).length;
  }

  get completedTasks(): number {
    return this.tasks.filter(
      task => task.status === 'COMPLETED'
    ).length;
  }

  get overdueTasks(): number {
    const today = this.getToday();

    return this.tasks.filter(task =>
      !!task.deadline &&
      task.deadline < today &&
      task.status !== 'COMPLETED' &&
      task.status !== 'CANCELLED'
    ).length;
  }

  get averageProgress(): number {
    if (this.tasks.length === 0) {
      return 0;
    }

    const totalProgress = this.tasks.reduce(
      (total, task) =>
        total + this.getProgress(task),
      0
    );

    return Math.round(
      totalProgress / this.tasks.length
    );
  }

  getProgress(task: TaskMember): number {
    const progress = Number(task.progress);

    if (!Number.isFinite(progress)) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(0, progress)
    );
  }

  getToday(): string {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(
      now.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      now.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  isOverdue(task: TaskMember): boolean {
    return !!task.deadline &&
      task.deadline < this.getToday() &&
      task.status !== 'COMPLETED' &&
      task.status !== 'CANCELLED';
  }

  getStatusLabel(status: TaskStatus): string {
    return this.statuses.find(
      item => item.value === status
    )?.label ?? status;
  }

  getStatusClass(status: TaskStatus): string {
    const classes: Record<TaskStatus, string> = {
      NOT_STARTED: 'status-not-started',
      IN_PROGRESS: 'status-in-progress',
      PENDING: 'status-pending',
      COMPLETED: 'status-completed',
      CANCELLED: 'status-cancelled'
    };

    return classes[status] ?? '';
  }

  saveTask(task: TaskMember): void {
    if (this.savingId !== null) {
      return;
    }

    this.savingId = task.taskMemberId;
    this.errorMessage = '';
    this.successMessage = '';

    this.taskMemberService
      .updateMyAssignment(
        task.taskMemberId,
        {
          status: task.status,
          progress: this.getProgress(task),
          note: task.note ?? ''
        }
      )
      .pipe(
        finalize(() => {
          this.savingId = null;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          console.log(
            '[Member Dashboard] Cập nhật thành công:',
            task.taskMemberId
          );

          this.successMessage =
            `Đã cập nhật công việc ${
              task.taskCode || task.taskName
            }.`;

          this.loadTasks();
        },
        error: error => {
          console.error(
            '[API] updateMyAssignment:',
            error
          );

          if (error.status === 401) {
            this.errorMessage =
              'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
          } else if (error.status === 403) {
            this.errorMessage =
              'Bạn không có quyền cập nhật công việc này.';
          } else {
            this.errorMessage =
              error.error?.message ||
              error.error?.error ||
              'Cập nhật thất bại. Vui lòng thử lại.';
          }

          this.cdr.detectChanges();
        }
      });
  }

  trackByTask(
    _index: number,
    task: TaskMember
  ): number {
    return task.taskMemberId;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }


selectedWorkDate = this.getToday();

workLogRows: MemberWorkLogRow[] = [];
workLogLoading = false;
savingWorkLogId: number | null = null;

trackByWorkLog(
  index: number,
  row: MemberWorkLogRow
): number {
  return row.taskMemberId;
}

getPlannedTotal(): number {
  return this.workLogRows.reduce(
    (total, row) => total + (Number(row.plannedHours) || 0),
    0
  );
}

getActualTotal(): number {
  return this.workLogRows.reduce(
    (total, row) => total + (Number(row.actualHours) || 0),
    0
  );
}

/**
 * Tải nhật ký theo ngày và ghép với các task được giao.
 */
loadWorkLogs(): void {
  if (!this.selectedWorkDate) {
    return;
  }

  this.workLogLoading = true;

  this.taskWorkLogService
    .getByDate(this.selectedWorkDate)
    .pipe(
      catchError((error) => {
        console.error('[API] getByDate work logs:', error);

        this.errorMessage = error.status === 401
          ? 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.'
          : error.status === 403
            ? 'Bạn không có quyền xem nhật ký công việc.'
            : error.error?.message
              || 'Không thể tải nhật ký công việc.';

        return of([] as TaskWorkLog[]);
      }),
      finalize(() => {
        this.workLogLoading = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe((logs: TaskWorkLog[]) => {
   
      const assignedTasks = this.tasks;

      this.workLogRows = assignedTasks.map((task) => {
        const log = logs.find(
          item => Number(item.taskMemberId) ===
                  Number(task.taskMemberId)
        );

        return {
          taskMemberId: task.taskMemberId,
          taskId: task.taskId,
          taskCode: task.taskCode,
          taskName: task.taskName,
          status: task.status,
          progress: task.progress,

          plannedHours: log
            ? Number(log.plannedHours) || 0
            : 0,

          actualHours: log
            ? Number(log.actualHours) || 0
            : 0,

          note: log?.note ?? ''
        } as MemberWorkLogRow;
      });

      console.log(
        '[Member Dashboard] Nhật ký ngày',
        this.selectedWorkDate,
        this.workLogRows
      );
    });
}

/**
 * Lưu hoặc cập nhật nhật ký theo taskMemberId + workDate.
 */
saveWorkLog(row: MemberWorkLogRow): void {
  this.errorMessage = '';
  this.successMessage = '';

  if (!row.taskMemberId || row.taskMemberId <= 0) {
    this.errorMessage = 'Task Member ID không hợp lệ.';
    return;
  }

  const plannedHours = Number(row.plannedHours);
  const actualHours = Number(row.actualHours);

  if (
    !Number.isFinite(plannedHours) ||
    !Number.isFinite(actualHours) ||
    plannedHours < 0 ||
    actualHours < 0 ||
    plannedHours > 24 ||
    actualHours > 24
  ) {
    this.errorMessage =
      'Số giờ dự kiến và thực tế phải từ 0 đến 24.';
    return;
  }

  if (this.savingWorkLogId !== null) {
    return;
  }

  const request: TaskWorkLogRequest = {
    taskMemberId: Number(row.taskMemberId),
    workDate: this.selectedWorkDate,
    plannedHours,
    actualHours,
    note: row.note ?? ''
  };

  this.savingWorkLogId = row.taskMemberId;

  this.taskWorkLogService
    .save(request)
    .pipe(
      finalize(() => {
        this.savingWorkLogId = null;
        this.cdr.detectChanges();
      })
    )
    .subscribe({
      next: () => {
        this.successMessage =
          `Đã lưu nhật ký công việc ${row.taskCode || row.taskName}.`;

        this.loadWorkLogs();
      },
      error: (error) => {
        console.error('[API] save work log:', error);

        if (error.status === 401) {
          this.errorMessage =
            'Phiên đăng nhập hết hạn hoặc JWT không hợp lệ.';
        } else if (error.status === 403) {
          this.errorMessage =
            'Không có quyền ghi nhật ký cho task này. ' +
            'Kiểm tra JWT và quyền sở hữu taskMemberId.';
        } else if (error.status === 404) {
          this.errorMessage =
            error.error?.message ||
            'Task không tồn tại hoặc không được giao cho bạn.';
        } else {
          this.errorMessage =
            error.error?.message ||
            `Lưu nhật ký thất bại (HTTP ${error.status}).`;
        }

        this.cdr.detectChanges();
      }
    });
}

  private redirectToLogin(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('userId');
    }

    this.router.navigate(['/login']);
  }
}
