
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../sidebar/sidebar';

import {
  Project,
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
export class ProjectsComponent implements OnInit {
  private readonly projectService = inject(ProjectService);

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

  emptyForm(): ProjectRequest {
    return {
      projectCode: '',
      projectName: '',
      description: '',
      projectStatus: 'ACTIVE'
    };
  }

  loadProjects(): void {
    this.loading = true;
    this.errorMessage = '';

    this.projectService.getProjects(
      this.page,
      this.pageSize,
      this.appliedKeyword,
      this.appliedStatus
    ).subscribe({
      next: response => {
        this.projects = response.content ?? [];
        this.totalElements = response.totalElements ?? 0;
        this.totalPages = response.totalPages ?? 0;
        this.page = response.number ?? this.page;

        if (this.selectedProject) {
          this.selectedProject =
            this.projects.find(
              p => p.projectId === this.selectedProject?.projectId
            ) ?? null;
        }

        this.loading = false;
      },
      error: error => {
        this.errorMessage =
          error.error?.message ||
          'Không thể tải danh sách dự án. Vui lòng kiểm tra backend.';
        this.loading = false;
      }
    });
  }

  refresh(): void {
    this.loadProjects();
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
    this.pageSize = Number(size);
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
    if (this.page < this.totalPages - 1 && !this.loading) {
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
      p => p.projectStatus === 'ACTIVE'
    ).length;
  }

  get inactiveCount(): number {
    return this.projects.filter(
      p => p.projectStatus === 'INACTIVE'
    ).length;
  }

  selectProject(project: Project): void {
    this.selectedProject = project;
  }

  startCreateProject(): void {
    this.editingProjectId = null;
    this.form = this.emptyForm();
    this.showForm = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  startEditProject(project: Project): void {
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
    this.showForm = false;
    this.editingProjectId = null;
    this.form = this.emptyForm();
  }

  saveProject(): void {
    if (this.saving) return;

    if (
      !this.form.projectCode.trim() ||
      !this.form.projectName.trim()
    ) {
      this.errorMessage = 'Vui lòng nhập mã và tên dự án.';
      return;
    }

    const payload: ProjectRequest = {
      projectCode: this.form.projectCode.trim(),
      projectName: this.form.projectName.trim(),
      description: this.form.description?.trim() ?? '',
      projectStatus: this.form.projectStatus
    };

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request = this.editingProjectId !== null
      ? this.projectService.updateProject(
          this.editingProjectId,
          payload
        )
      : this.projectService.createProject(payload);

    request.subscribe({
      next: project => {
        const isEditing = this.editingProjectId !== null;

        this.saving = false;
        this.showForm = false;
        this.editingProjectId = null;
        this.successMessage = isEditing
          ? 'Cập nhật dự án thành công.'
          : 'Tạo dự án thành công.';

        this.selectedProject = project ?? null;
        this.page = 0;
        this.loadProjects();
      },
      error: error => {
        this.saving = false;
        this.errorMessage =
          error.error?.message ||
          'Không thể lưu dự án. Vui lòng kiểm tra dữ liệu.';
      }
    });
  }

  deleteProject(project: Project): void {
    if (this.deleting) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn ngừng hoạt động dự án "${project.projectName}"?`
    );

    if (!confirmed) return;

    this.deleting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.projectService.deleteProject(project.projectId)
      .subscribe({
        next: () => {
          this.deleting = false;
          this.successMessage =
            'Đã ngừng hoạt động dự án thành công.';

          if (
            this.selectedProject?.projectId === project.projectId
          ) {
            this.selectedProject = null;
          }

          this.loadProjects();
        },
        error: error => {
          this.deleting = false;
          this.errorMessage =
            error.error?.message ||
            'Không thể xóa dự án. Vui lòng thử lại.';
        }
      });
  }

  statusLabel(status: ProjectStatus): string {
    return status === 'ACTIVE'
      ? 'Đang hoạt động'
      : 'Ngừng hoạt động';
  }

  statusClass(status: ProjectStatus): string {
    return status === 'ACTIVE' ? 'status-active' : 'status-inactive';
  }

  trackProject(_index: number, project: Project): number {
    return project.projectId;
  }
}
