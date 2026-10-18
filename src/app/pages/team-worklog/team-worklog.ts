import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  finalize,
  Subscription,
  timeout
} from 'rxjs';

import { TaskWorkLogService } from '../../services/task-work-log.service';
import { SidebarComponent } from '../sidebar/sidebar';

interface TeamWorkLog {
  workLogId: number;
  taskMemberId: number;
  taskId: number;
  taskCode: string;
  taskName: string;
  memberId: number;
  memberName: string;
  workDate: string;
  plannedHours: number;
  actualHours: number;
  note: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

@Component({
  selector: 'app-team-worklog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SidebarComponent
  ],
  templateUrl: './team-worklog.html',
  styleUrls: ['./team-worklog.css']
})
export class TeamWorklogComponent implements OnInit, OnDestroy {

  private readonly workLogService = inject(TaskWorkLogService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();

  logs: TeamWorkLog[] = [];

  from = '';
  to = '';

  page = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  loading = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    const today = new Date();

    const firstDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    this.from = this.formatDate(firstDay);
    this.to = this.formatDate(today);

    this.loadWorkLogs();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadWorkLogs(): void {
    if (this.loading) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.from || !this.to) {
      this.errorMessage =
        'Vui lòng chọn ngày bắt đầu và ngày kết thúc.';
      return;
    }

    if (this.from > this.to) {
      this.errorMessage =
        'Ngày bắt đầu không được lớn hơn ngày kết thúc.';
      return;
    }

    this.loading = true;

    const sub = this.workLogService
      .getTeamWorkLogs(
        this.from,
        this.to,
        this.page,
        this.pageSize
      )
      .pipe(
        timeout(15000),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response: any) => {
          this.logs = Array.isArray(response?.content)
            ? response.content
            : [];

          this.totalElements = Number(
            response?.totalElements ?? 0
          );

          this.totalPages = Number(
            response?.totalPages ?? 0
          );

          this.cdr.markForCheck();
        },
        error: (error: unknown) => {
          this.logs = [];
          this.totalElements = 0;
          this.totalPages = 0;

          this.errorMessage = this.getErrorMessage(
            error,
            'Không thể tải Worklog nhóm.'
          );

          this.cdr.markForCheck();
        }
      });

    this.subscriptions.add(sub);
  }

  search(): void {
    this.page = 0;
    this.loadWorkLogs();
  }

  refresh(): void {
    this.loadWorkLogs();
  }

  previousPage(): void {
    if (this.page <= 0 || this.loading) {
      return;
    }

    this.page--;
    this.loadWorkLogs();
  }

  nextPage(): void {
    if (
      this.page + 1 >= this.totalPages ||
      this.loading
    ) {
      return;
    }

    this.page++;
    this.loadWorkLogs();
  }

  changePageSize(value: number | string): void {
    const newSize = Number(value);

    if (![10, 20, 50].includes(newSize)) {
      return;
    }

    this.pageSize = newSize;
    this.page = 0;
    this.loadWorkLogs();
  }

  get firstItemNumber(): number {
    return this.totalElements === 0
      ? 0
      : this.page * this.pageSize + 1;
  }

  get lastItemNumber(): number {
    return Math.min(
      (this.page + 1) * this.pageSize,
      this.totalElements
    );
  }

  trackWorkLog(
    _index: number,
    log: TeamWorkLog
  ): number {
    return log.workLogId;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getErrorMessage(
    error: unknown,
    fallback: string
  ): string {
    const err = error as any;

    if (err?.name === 'TimeoutError') {
      return 'Yêu cầu xử lý quá thời gian. Vui lòng thử lại.';
    }

    if (err?.status === 0) {
      return 'Không thể kết nối Backend. Kiểm tra server và mạng.';
    }

    if (err?.status === 401) {
      return 'Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập.';
    }

    if (err?.status === 403) {
      return 'Bạn không có quyền xem Worklog nhóm.';
    }

    const message =
      err?.error?.error ??
      err?.error?.message ??
      err?.error?.detail ??
      err?.message;

    return typeof message === 'string' && message.trim()
      ? message
      : fallback;
  }
}
