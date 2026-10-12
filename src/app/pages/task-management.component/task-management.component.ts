import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Route, Router,RouterModule } from '@angular/router';
import { finalize, Subscription, timeout } from 'rxjs';
import { Customer, CustomerService } from '../../services/customer.service';

import {
  TaskAssignmentService,
  TaskItem,
  TaskFilter,
  TaskRequest,
  TaskProjectOption
} from '../../services/task-assignment.service';

 import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-task-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './task-management.component.html',
  styleUrl: './task-management.component.css'
})
export class TaskManagementCompoenent implements OnInit, OnDestroy {
  private taskRequest?: Subscription;
  private projectRequest?: Subscription;
  private requestId = 0;
  private projectRequestId = 0;

  tasks: TaskItem[] = [];
  projects: TaskProjectOption[] = [];
  selectedTask: TaskItem | null = null;
  customers: Customer[] = [];

  loadingTasks = false;
  loadingProjects = false;
  saving = false;
  deleting = false;
  showForm = false;
  editingTaskId: number | null = null;

  errorMessage = '';
  successMessage = '';

  taskPage = 0;
  taskSize = 10;
  totalTasks = 0;
  totalPages = 0;

  searchTask = '';
  filterStatus = '';
  filterProjectId: number | null = null;
  filterCustomerId: number | null = null;
  filterUserId: number | null = null;
  filterDeadlineFrom = '';
  filterDeadlineTo = '';
  sortOption = 'taskId,desc';

  readonly statuses = [
    { value: 'NOT_STARTED', label: 'Chưa bắt đầu' },
    { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
    { value: 'PENDING', label: 'Tạm hoãn' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'CANCELLED', label: 'Đã hủy' }
  ];

  form: TaskRequest = this.createEmptyForm();

  constructor(
    private taskService: TaskAssignmentService,
    private authService: AuthService,
    private customerService: CustomerService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadTasks();
    this.loadProjects();
    this.loadCustomers();
  }

  private createEmptyForm(): TaskRequest {
    return {
      taskCode: '',
      taskName: '',
      projectId: null,
      customerId: null,
      createdBy: null,
      startDate: '',
      deadline: '',
      releaseDate: '',
      priorityId: 2,
      status: 'NOT_STARTED',
      description: '',
      note: ''
    };
  }

  get firstTaskNumber(): number {
    return this.totalTasks === 0
      ? 0
      : this.taskPage * this.taskSize + 1;
  }

  get lastTaskNumber(): number {
    return Math.min(
      (this.taskPage + 1) * this.taskSize,
      this.totalTasks
    );
  }

  get inProgressCount(): number {
    return this.tasks.filter(
      task => task.status === 'IN_PROGRESS'
    ).length;
  }

  get completedCount(): number {
    return this.tasks.filter(
      task => task.status === 'COMPLETED'
    ).length;
  }

  get pendingCount(): number {
    return this.tasks.filter(
      task => task.status === 'PENDING'
    ).length;
  }

  get selectedProjectName(): string {
    return this.selectedTask?.projectName || '-';
  }

  loadTasks(): void {
    const currentRequestId = ++this.requestId;

    this.taskRequest?.unsubscribe();

    this.loadingTasks = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    const filters: TaskFilter = {
      page: this.taskPage,
      size: this.taskSize,
      sort: this.sortOption,
      keyword: this.searchTask.trim(),
      status: this.filterStatus || '',
      projectId: this.filterProjectId,
      customerId: this.filterCustomerId,
      userId: this.filterUserId,
      deadlineFrom: this.filterDeadlineFrom || '',
      deadlineTo: this.filterDeadlineTo || ''
    };

    this.taskRequest = this.taskService
      .filterTasks(filters)
      .pipe(
        timeout({ first: 15000 }),
        finalize(() => {
          if (currentRequestId === this.requestId) {
            this.loadingTasks = false;
            this.cdr.detectChanges();
          }
        })
      )
      .subscribe({
        next: response => {
          if (currentRequestId !== this.requestId) {
            return;
          }

          this.tasks = response?.content ?? [];
          this.totalTasks = response?.totalElements ?? 0;
          this.totalPages = response?.totalPages ?? 0;

          // Giữ task được chọn nếu task vẫn nằm trong kết quả.
          if (this.selectedTask) {
            const refreshedTask = this.tasks.find(
              task => task.taskId === this.selectedTask?.taskId
            );

            if (refreshedTask) {
              this.selectedTask = refreshedTask;
            } else if (this.tasks.length > 0) {
              this.selectedTask = this.tasks[0];
            } else {
              this.selectedTask = null;
            }
          } else if (this.tasks.length > 0) {
            this.selectedTask = this.tasks[0];
          }

          this.cdr.detectChanges();
        },
        error: error => {
          if (currentRequestId !== this.requestId) {
            return;
          }

          console.error('[TaskManagement] Load tasks error:', error);

          this.tasks = [];
          this.totalTasks = 0;
          this.totalPages = 0;
          this.selectedTask = null;

          this.errorMessage =
            error?.name === 'TimeoutError'
              ? 'Tải danh sách task quá 15 giây. Vui lòng thử lại.'
              : error?.status === 401
                ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
                : error?.status === 403
                  ? 'Bạn không có quyền xem danh sách task.'
                  : error?.status === 0
                    ? 'Không kết nối được backend.'
                    : error?.error?.message ||
                      `Không tải được task (HTTP ${error?.status ?? 'unknown'}).`;

          this.cdr.detectChanges();
        }
      });
  }

  loadProjects(): void {
    const currentRequestId = ++this.projectRequestId;

    this.projectRequest?.unsubscribe();
    this.loadingProjects = true;

    this.projectRequest = this.taskService
      .getProjects()
      .pipe(
        timeout({ first: 15000 }),
        finalize(() => {
          if (currentRequestId === this.projectRequestId) {
            this.loadingProjects = false;
            this.cdr.detectChanges();
          }
        })
      )
      .subscribe({
        next: projects => {
          if (currentRequestId !== this.projectRequestId) {
            return;
          }

          this.projects = projects ?? [];
          this.cdr.detectChanges();
        },
        error: error => {
          if (currentRequestId !== this.projectRequestId) {
            return;
          }

          console.error('[TaskManagement] Load projects error:', error);
          this.projects = [];
          this.cdr.detectChanges();
        }
      });
  }

  applyFilters(): void {
    this.taskPage = 0;
    this.loadTasks();
  }

  resetFilters(): void {
    this.searchTask = '';
    this.filterStatus = '';
    this.filterProjectId = null;
    this.filterCustomerId = null;
    this.filterUserId = null;
    this.filterDeadlineFrom = '';
    this.filterDeadlineTo = '';
    this.sortOption = 'taskId,desc';
    this.taskPage = 0;

    this.loadTasks();
  }

  searchTasks(): void {
    this.applyFilters();
  }

  changePageSize(value: number | string): void {
    const newSize = Number(value);

    if (
      !Number.isFinite(newSize) ||
      newSize <= 0 ||
      newSize === this.taskSize
    ) {
      return;
    }

    this.taskSize = newSize;
    this.taskPage = 0;
    this.loadTasks();
  }

  previousPage(): void {
    if (this.loadingTasks || this.taskPage <= 0) {
      return;
    }

    this.taskPage--;
    this.loadTasks();
  }

  nextPage(): void {
    if (
      this.loadingTasks ||
      this.taskPage >= this.totalPages - 1
    ) {
      return;
    }

    this.taskPage++;
    this.loadTasks();
  }

  selectTask(task: TaskItem): void {
    this.selectedTask = task;
    this.successMessage = '';
    this.errorMessage = '';
  }

  startCreateTask(): void {
    this.editingTaskId = null;
    this.form = this.createEmptyForm();
    this.showForm = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  startEditTask(task: TaskItem): void {
    this.selectedTask = task;
    this.editingTaskId = task.taskId;
    this.errorMessage = '';
    this.successMessage = '';

    this.form = {
      taskCode: task.taskCode ?? '',
      taskName: task.taskName ?? '',
      projectId: task.projectId ?? null,
      customerId: task.customerId ?? null,
      createdBy: task.createdBy ?? null,
      startDate: this.toDateInput(task.startDate),
      deadline: this.toDateInput(task.deadline),
      releaseDate: this.toDateInput(task.releaseDate),
      priorityId: task.priorityId ?? 2,
      status: task.status ?? 'NOT_STARTED',
      description: task.description ?? '',
      note: task.note ?? ''
    };

    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingTaskId = null;
    this.form = this.createEmptyForm();
  }

  private toDateInput(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return value.length >= 10 ? value.substring(0, 10) : value;
  }

  saveTask(): void {
    if (this.saving) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    const taskCode = this.form.taskCode?.trim();
    const taskName = this.form.taskName?.trim();

    if (!taskCode || !taskName) {
      this.errorMessage = 'Vui lòng nhập mã task và tên task.';
      return;
    }

    if (
      this.form.deadline &&
      this.form.startDate &&
      this.form.deadline < this.form.startDate
    ) {
      this.errorMessage = 'Deadline không được trước ngày bắt đầu.';
      return;
    }

    const body: TaskRequest = {
      ...this.form,
      taskCode,
      taskName,

      // createdBy = this.authService.getUsername();

      projectId: this.form.projectId ?? null,
      customerId: this.form.customerId ?? null,
      createdBy: this.authService.getUserId(),
      startDate: this.form.startDate || null,
      deadline: this.form.deadline || null,
      releaseDate: this.form.releaseDate || null,
      priorityId: Number(this.form.priorityId) || 2,
      status: this.form.status || 'NOT_STARTED',
      description: this.form.description?.trim() || null,
      note: this.form.note?.trim() || null
    };

    this.saving = true;
    this.cdr.detectChanges();

    const isEditing = this.editingTaskId !== null;
    const request$ = isEditing
      ? this.taskService.updateTask(this.editingTaskId!, body)
      : this.taskService.createTask(body);

    request$
      .pipe(
        timeout({ first: 15000 }),
        finalize(() => {
          this.saving = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: savedTask => {
          this.successMessage = isEditing
            ? 'Cập nhật task thành công.'
            : 'Thêm task thành công.';

          this.showForm = false;
          this.editingTaskId = null;
          this.form = this.createEmptyForm();

          if (savedTask) {
            this.selectedTask = savedTask;
          }

          this.taskPage = 0;
          this.loadTasks();
        },
        error: error => {
          console.error('[TaskManagement] Save task error:', error);

          this.errorMessage =
            error?.name === 'TimeoutError'
              ? 'Lưu task quá 15 giây. Hãy kiểm tra lại dữ liệu trước khi thử lại.'
              : error?.status === 400
                ? error?.error?.message ||
                  'Dữ liệu task không hợp lệ. Hãy kiểm tra các trường đã nhập.'
                : error?.status === 401
                  ? 'Phiên đăng nhập đã hết hạn.'
                  : error?.status === 403
                    ? 'Bạn không có quyền thêm hoặc sửa task.'
                    : error?.error?.message ||
                      `Không lưu được task (HTTP ${error?.status ?? 'unknown'}).`;

          this.cdr.detectChanges();
        }
      });
  }

  loadCustomers(): void {
    this.customerService.findAll().subscribe({
      next: (data) => {
        this.customers = data.filter(
          customer => customer.customerStatus === 'ACTIVE'
        );
      },
      error: (error) => {
        console.error('Lỗi tải danh sách khách hàng:', error);
      }
    });
  }

  deleteTask(task: TaskItem): void {
    if (this.deleting) {
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa task "${task.taskName}" (${task.taskCode}) không?`
    );

    if (!confirmed) {
      return;
    }

    this.deleting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.taskService
      .deleteTask(task.taskId)
      .pipe(
        timeout({ first: 15000 }),
        finalize(() => {
          this.deleting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.successMessage = `Đã xóa task "${task.taskName}".`;

          if (this.selectedTask?.taskId === task.taskId) {
            this.selectedTask = null;
          }

          // Nếu xóa task cuối cùng của trang, lùi về trang trước.
          if (this.tasks.length === 1 && this.taskPage > 0) {
            this.taskPage--;
          }

          this.loadTasks();
        },
        error: error => {
          console.error('[TaskManagement] Delete task error:', error);

          this.errorMessage =
            error?.status === 401
              ? 'Phiên đăng nhập đã hết hạn.'
              : error?.status === 403
                ? 'Bạn không có quyền xóa task.'
                : error?.status === 404
                  ? 'Task không còn tồn tại hoặc đã được xóa.'
                  : error?.error?.message ||
                    `Không xóa được task (HTTP ${error?.status ?? 'unknown'}).`;

          this.cdr.detectChanges();
        }
      });
  }

  refresh(): void {
    this.loadTasks();
    this.loadProjects();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  trackTask(_: number, task: TaskItem): number {
    return task.taskId;
  }

  statusLabel(status: string | undefined | null): string {
    if (!status) {
      return '-';
    }

    return this.statuses.find(item => item.value === status)?.label || status;
  }

  statusClass(status: string | undefined | null): string {
    return (status || 'unknown').toLowerCase().replace(/_/g, '-');
  }

  priorityClass(priority: string | undefined | null): string {
    const value = (priority || '').toLowerCase();

    if (value.includes('urgent') || value.includes('critical')) {
      return 'priority-urgent';
    }

    if (value.includes('high') || value.includes('cao')) {
      return 'priority-high';
    }

    if (value.includes('low') || value.includes('thấp')) {
      return 'priority-low';
    }

    if (value.includes('medium') || value.includes('normal')) {
      return 'priority-medium';
    }

    return 'priority-unknown';
  }

  ngOnDestroy(): void {
    ++this.requestId;
    ++this.projectRequestId;

    this.taskRequest?.unsubscribe();
    this.projectRequest?.unsubscribe();
  }
}