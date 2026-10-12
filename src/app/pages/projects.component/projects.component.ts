
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Subscription,
  finalize,
  timeout
} from 'rxjs';

import { SidebarComponent } from '../sidebar/sidebar';

import {
  Project,
  ProjectPage,
  ProjectRequest,
  ProjectService,
  ProjectStatus
} from '../../services/project.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css'
})
export class ProjectsComponent implements OnInit, OnDestroy {
  private readonly projectService = inject(ProjectService);
  private readonly cdr = inject(ChangeDetectorRef);

  private projectRequest?: Subscription;
  private saveRequest?: Subscription;
  private deleteRequest?: Subscription;

  private requestId = 0;
  private destroyed = false;

  projects: Project[] = [];
  selectedProject: Project | null = null;

  loading = false;
  saving = false;
  deleting = false;
  showForm = false;
  editingProjectId: number | null = null;

  errorMessage = '';
  successMessage = '';

  keyword = '';
  filterStatus = '';
  appliedKeyword = '';
  appliedStatus = '';

  page = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  form: ProjectRequest = this.emptyForm();

  readonly statuses: {
    value: ProjectStatus;
    label: string;
  }[] = [
      { value: 'ACTIVE', label: 'Đang hoạt động' },
      { value: 'INACTIVE', label: 'Ngừng hoạt động' }
    ];

  ngOnInit(): void {
    this.loadProjects();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.requestId++;

    this.projectRequest?.unsubscribe();
    this.saveRequest?.unsubscribe();
    this.deleteRequest?.unsubscribe();
  }

  emptyForm(): ProjectRequest {
    return {
      projectCode: '',
      projectName: '',
      description: '',
      projectStatus: 'ACTIVE'
    };
  }

  loadProjects(): void {
    if (this.destroyed) {
      return;
    }

    const currentRequestId = ++this.requestId;

    this.projectRequest?.unsubscribe();

    this.loading = true;
    this.errorMessage = '';

    this.projectRequest = this.projectService
      .getProjects(
        this.page,
        this.pageSize,
        this.appliedKeyword,
        this.appliedStatus
      )
      .pipe(
        timeout({ first: 15000 }),
        finalize(() => {
          if (
            !this.destroyed &&
            currentRequestId === this.requestId
          ) {
            this.loading = false;
            this.cdr.markForCheck();
          }
        })
      )
      .subscribe({
        next: (response: ProjectPage) => {
          if (
            this.destroyed ||
            currentRequestId !== this.requestId
          ) {
            return;
          }

          this.projects = response?.content ?? [];
          this.totalElements = response?.totalElements ?? 0;
          this.totalPages = response?.totalPages ?? 0;
          this.page = response?.number ?? this.page;

          this.syncSelectedProject();
          this.cdr.markForCheck();
        },
        error: error => {
          if (
            this.destroyed ||
            currentRequestId !== this.requestId
          ) {
            return;
          }

          this.errorMessage = this.getErrorMessage(
            error,
            'Không thể tải danh sách dự án. Vui lòng thử lại.'
          );

          this.cdr.markForCheck();
        }
      });
  }

  refresh(): void {
    this.loadProjects();
  }

  private syncSelectedProject(): void {
    if (!this.selectedProject) {
      return;
    }

    this.selectedProject =
      this.projects.find(
        project =>
          project.projectId === this.selectedProject?.projectId
      ) ?? null;
  }

  applyFilters(): void {
    this.appliedKeyword = this.keyword.trim();
    this.appliedStatus = this.filterStatus;
    this.page = 0;

    this.loadProjects();
  }

  resetFilters(): void {
    this.keyword = '';
    this.filterStatus = '';
    this.appliedKeyword = '';
    this.appliedStatus = '';
    this.page = 0;

    this.loadProjects();
  }

  changePageSize(size: number): void {
    const newSize = Number(size);

    if (
      !Number.isInteger(newSize) ||
      newSize <= 0 ||
      newSize === this.pageSize
    ) {
      return;
    }

    this.pageSize = newSize;
    this.page = 0;

    this.loadProjects();
  }

  previousPage(): void {
    if (this.page > 0 && !this.loading) {
      this.page--;
      this.loadProjects();
    }
  }

  nextPage(): void {
    if (
      this.page < this.totalPages - 1 &&
      !this.loading
    ) {
      this.page++;
      this.loadProjects();
    }
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

  get activeCount(): number {
    return this.projects.filter(
      project => project.projectStatus === 'ACTIVE'
    ).length;
  }

  get inactiveCount(): number {
    return this.projects.filter(
      project => project.projectStatus === 'INACTIVE'
    ).length;
  }

  selectProject(project: Project): void {
    this.selectedProject = project;
  }

  startCreateProject(): void {
    setTimeout(() => {
      document.getElementById('assignment-form')
       ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
    });

    if (this.saving) {
      return;
    }

    this.editingProjectId = null;
    this.form = this.emptyForm();
    this.showForm = true;

    this.errorMessage = '';
    this.successMessage = '';
  }

  startEditProject(project: Project): void {

       setTimeout(() => {
      document.getElementById('assignment-form')
       ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
    });

    if (this.saving) {
      return;
    }

    this.editingProjectId = project.projectId;

    this.form = {
      projectCode: project.projectCode,
      projectName: project.projectName,
      description: project.description ?? '',
      projectStatus: project.projectStatus
    };

    this.showForm = true;

    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelForm(): void {
    if (this.saving) {
      return;
    }

    this.showForm = false;
    this.editingProjectId = null;
    this.form = this.emptyForm();
    this.errorMessage = '';
  }

  saveProject(): void {
    if (this.saving) {
      return;
    }

    const projectCode = this.form.projectCode?.trim() ?? '';
    const projectName = this.form.projectName?.trim() ?? '';

    if (!projectCode || !projectName) {
      this.errorMessage = 'Vui lòng nhập mã và tên dự án.';
      return;
    }

    const payload: ProjectRequest = {
      projectCode,
      projectName,
      description: this.form.description?.trim() ?? '',
      projectStatus: this.form.projectStatus
    };

    const projectId = this.editingProjectId;
    const isEditing = projectId !== null;

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request = isEditing
      ? this.projectService.updateProject(projectId!, payload)
      : this.projectService.createProject(payload);

    this.saveRequest?.unsubscribe();

    this.saveRequest = request
      .pipe(
        timeout({ first: 15000 }),
        finalize(() => {
          if (!this.destroyed) {
            this.saving = false;
            this.cdr.markForCheck();
          }
        })
      )
      .subscribe({
        next: project => {
          if (this.destroyed) {
            return;
          }

          this.showForm = false;
          this.editingProjectId = null;
          this.form = this.emptyForm();

          this.successMessage = isEditing
            ? 'Cập nhật dự án thành công.'
            : 'Tạo dự án thành công.';

          this.selectedProject = project ?? null;
          this.page = 0;

          this.loadProjects();
          this.cdr.markForCheck();
        },
        error: error => {
          if (this.destroyed) {
            return;
          }

          this.errorMessage = this.getErrorMessage(
            error,
            'Không thể lưu dự án. Vui lòng kiểm tra dữ liệu.'
          );

          this.cdr.markForCheck();
        }
      });
  }

  deleteProject(project: Project): void {
    if (this.deleting) {
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn ngừng hoạt động dự án "${project.projectName}"?`
    );

    if (!confirmed) {
      return;
    }

    this.deleting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.deleteRequest?.unsubscribe();

    this.deleteRequest = this.projectService
      .deleteProject(project.projectId)
      .pipe(
        timeout({ first: 15000 }),
        finalize(() => {
          if (!this.destroyed) {
            this.deleting = false;
            this.cdr.markForCheck();
          }
        })
      )
      .subscribe({
        next: () => {
          if (this.destroyed) {
            return;
          }

          this.successMessage =
            'Đã ngừng hoạt động dự án thành công.';

          if (
            this.selectedProject?.projectId === project.projectId
          ) {
            this.selectedProject = null;
          }

          if (this.projects.length === 1 && this.page > 0) {
            this.page--;
          }

          this.loadProjects();
          this.cdr.markForCheck();
        },
        error: error => {
          if (this.destroyed) {
            return;
          }

          this.errorMessage = this.getErrorMessage(
            error,
            'Không thể ngừng hoạt động dự án. Vui lòng thử lại.'
          );

          this.cdr.markForCheck();
        }
      });
  }

  statusLabel(status: ProjectStatus): string {
    return status === 'ACTIVE'
      ? 'Đang hoạt động'
      : 'Ngừng hoạt động';
  }

  statusClass(status: ProjectStatus): string {
    return status === 'ACTIVE'
      ? 'status-active'
      : 'status-inactive';
  }

  trackProject(
    _index: number,
    project: Project
  ): number {
    return project.projectId;
  }

  private getErrorMessage(
    error: any,
    defaultMessage: string
  ): string {
    if (error?.name === 'TimeoutError') {
      return 'Máy chủ phản hồi quá chậm. Vui lòng thử lại.';
    }

    if (error?.status === 0) {
      return 'Không thể kết nối máy chủ. Vui lòng kiểm tra backend.';
    }

    if (error?.status === 401) {
      return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
    }

    if (error?.status === 403) {
      return 'Bạn không có quyền thực hiện thao tác này.';
    }

    return (
      error?.error?.message ||
      error?.error?.detail ||
      defaultMessage
    );
  }
}
