import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  TaskAssignmentService,
  TaskItem,
  TaskFilter,
  TaskRequest,
  TaskProjectOption
} from '../../services/task-assignment.service';
import { RouterModule } from '@angular/router';


@Component({
  imports: [CommonModule, FormsModule, RouterModule],
  selector: 'app-task-management.component',
  styleUrl: './task-management.component.css',
  templateUrl: './task-management.component.html',
  standalone: true,

})
export class TaskManagementCompoenent implements OnInit {
   tasks: TaskItem[] = [];
  projects: TaskProjectOption[] = [];

  loading = false;
  saving = false;
  showForm = false;
  editingId: number | null = null;

  errorMessage = '';
  successMessage = '';

  page = 0;
  size = 10;
  totalPages = 0;
  totalElements = 0;

  filters = {
    keyword: '',
    status: '',
    projectId: null as number | null,
    customerId: null as number | null,
    userId: null as number | null,
    deadlineFrom: '',
    deadlineTo: ''
  };

  statuses = [
    { value: 'NOT_STARTED', label: 'Chưa bắt đầu' },
    { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'CANCELLED', label: 'Đã hủy' }
  ];

  form: TaskRequest = this.emptyForm();

  constructor(private taskService: TaskAssignmentService) {}

  ngOnInit(): void {
    this.loadProjects();
    this.loadTasks();
  }

  private emptyForm(): TaskRequest {
    return {
      taskCode: '',
      taskName: '',
      projectId: null,
      customerId: null,
      createdBy: null,
      startDate: null,
      deadline: null,
      releaseDate: null,
      priorityId: 2,
      status: 'NOT_STARTED',
      description: '',
      note: ''
    };
  }

  loadProjects(): void {
    this.taskService.getProjects().subscribe({
      next: data => this.projects = Array.isArray(data) ? data : [],
      error: () => this.projects = []
    });
  }

  loadTasks(): void {
    this.loading = true;
    this.errorMessage = '';

    const filter: TaskFilter = {
      page: this.page,
      size: this.size,
      sort: 'taskId,desc',
      keyword: this.filters.keyword.trim() || undefined,
      status: this.filters.status || undefined,
      projectId: this.filters.projectId,
      customerId: this.filters.customerId,
      userId: this.filters.userId,
      deadlineFrom: this.filters.deadlineFrom || undefined,
      deadlineTo: this.filters.deadlineTo || undefined
    };

    this.taskService.filterTasks(filter).subscribe({
      next: response => {
        this.tasks = response.content ?? [];
        this.totalPages = response.totalPages ?? 0;
        this.totalElements = response.totalElements ?? 0;
        this.page = response.number ?? this.page;
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message || 'Không thể tải danh sách công việc.';
      }
    });
  }

  search(): void {
    if (
      this.filters.deadlineFrom &&
      this.filters.deadlineTo &&
      this.filters.deadlineFrom > this.filters.deadlineTo
    ) {
      this.errorMessage = 'Ngày bắt đầu lọc không được sau ngày kết thúc.';
      return;
    }

    this.page = 0;
    this.loadTasks();
  }

  resetFilters(): void {
    this.filters = {
      keyword: '',
      status: '',
      projectId: null,
      customerId: null,
      userId: null,
      deadlineFrom: '',
      deadlineTo: ''
    };
    this.page = 0;
    this.errorMessage = '';
    this.loadTasks();
  }

  changePage(newPage: number): void {
    if (newPage < 0 || newPage >= this.totalPages) return;
    this.page = newPage;
    this.loadTasks();
  }

  openCreate(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.errorMessage = '';
    this.showForm = true;
  }

  openEdit(task: TaskItem): void {
    this.editingId = task.taskId;
    this.errorMessage = '';

    this.form = {
      taskCode: task.taskCode ?? '',
      taskName: task.taskName ?? '',
      projectId: task.projectId ?? null,
      customerId: task.customerId ?? null,
      createdBy: task.createdBy ?? null,
      startDate: task.startDate ?? null,
      deadline: task.deadline ?? null,
      releaseDate: task.releaseDate ?? null,
      priorityId: task.priorityId ?? 2,
      status: task.status ?? 'NOT_STARTED',
      description: task.description ?? '',
      note: task.note ?? ''
    };

    this.showForm = true;
  }

  closeForm(): void {
    if (this.saving) return;
    this.showForm = false;
    this.errorMessage = '';
  }

  saveTask(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.taskCode.trim()) {
      this.errorMessage = 'Vui lòng nhập mã công việc.';
      return;
    }

    if (!this.form.taskName.trim()) {
      this.errorMessage = 'Vui lòng nhập tên công việc.';
      return;
    }

    if (
      this.form.startDate &&
      this.form.deadline &&
      this.form.startDate > this.form.deadline
    ) {
      this.errorMessage = 'Deadline không được trước ngày bắt đầu.';
      return;
    }

    const body: TaskRequest = {
      ...this.form,
      taskCode: this.form.taskCode.trim(),
      taskName: this.form.taskName.trim(),
      description: this.form.description?.trim() || null,
      note: this.form.note?.trim() || null
    };

    this.saving = true;

    const request = this.editingId !== null
      ? this.taskService.updateTask(this.editingId, body)
      : this.taskService.createTask(body);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.successMessage = this.editingId !== null
          ? 'Cập nhật công việc thành công.'
          : 'Tạo công việc thành công.';
        this.loadTasks();
      },
      error: err => {
        this.saving = false;
        this.errorMessage =
          err?.error?.message ||
          'Không thể lưu công việc. Hãy kiểm tra dữ liệu và API backend.';
      }
    });
  }

  deleteTask(task: TaskItem): void {
    const confirmed = confirm(
      `Bạn có chắc muốn xóa công việc "${task.taskName}" không?`
    );

    if (!confirmed) return;

    this.errorMessage = '';
    this.successMessage = '';

    this.taskService.deleteTask(task.taskId).subscribe({
      next: () => {
        this.successMessage = 'Xóa công việc thành công.';

        if (this.tasks.length === 1 && this.page > 0) {
          this.page--;
        }

        this.loadTasks();
      },
      error: err => {
        this.errorMessage =
          err?.error?.message ||
          'Không thể xóa công việc. Công việc có thể đang được phân công.';
      }
    });
  }

  statusLabel(status?: string): string {
    return this.statuses.find(s => s.value === status)?.label
      ?? status
      ?? 'Chưa xác định';
  }

  statusClass(status?: string): string {
    switch (status) {
      case 'IN_PROGRESS': return 'in-progress';
      case 'COMPLETED': return 'completed';
      case 'CANCELLED': return 'cancelled';
      default: return 'not-started';
    }
  }

  priorityLabel(priorityId?: number | null): string {
    switch (priorityId) {
      case 1: return 'Cao';
      case 3: return 'Thấp';
      default: return 'Trung bình';
    }
  }

  projectLabel(task: TaskItem): string {
    return task.projectName
      || this.projects.find(p => p.projectId === task.projectId)?.projectName
      || (task.projectId ? `Project #${task.projectId}` : 'Chưa có project');
  }

  trackByTaskId(_: number, task: TaskItem): number {
    return task.taskId;
  }
}
