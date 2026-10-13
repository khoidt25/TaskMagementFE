import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  UserAdminService,
  UserResponse
} from '../../services/user-admin.service';
import { SidebarComponent } from '../sidebar/sidebar';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent implements OnInit {
  private readonly userService = inject(UserAdminService);

  activeTab: 'users' | 'assignments' = 'users';
  
  loading = false;
  saving = false;
  deleting = false;

  errorMessage = '';
  successMessage = '';

  users: UserResponse[] = [];
  filteredUsers: UserResponse[] = [];
  selectedUser: UserResponse | null = null;

  keyword = '';
  filterRole = '';
  filterStatus = '';

  page = 0;
  pageSize = 10;
  totalElements = 0;

  showForm = false;

  form = {
    username: '',
    email: '',
    password: '',
    roleId: 3
  };

  managers: UserResponse[] = [];
  members: UserResponse[] = [];

  selectedManagerId: number | null = null;
  selectedMemberIds: number[] = [];
  selectedProjectIds: number[] = [];

  assignedMemberIds: number[] = [];
  assignedProjectIds: number[] = [];

  // Kết nối mảng này với ProjectService hiện có của dự án.
  projects: Array<{
    projectId: number;
    projectName: string;
  }> = [];

  ngOnInit(): void {
    this.refresh();
  }

  get totalPages(): number {
    return Math.ceil(this.totalElements / this.pageSize);
  }

  get activeCount(): number {
    return this.users.filter(
      user => this.statusOf(user) === 'ACTIVE'
    ).length;
  }

  get activeUsersCount(): number {
    return this.activeCount;
  }

  get inactiveCount(): number {
    return this.users.filter(
      user => this.statusOf(user) !== 'ACTIVE'
    ).length;
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

  refresh(): void {
    this.loading = true;
    this.errorMessage = '';

    this.userService
      .getAll()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: data => {
          this.users = data ?? [];

          this.managers = this.users.filter(
            user => this.roleOf(user) === 'MANAGER'
          );

          this.members = this.users.filter(
            user => this.roleOf(user) === 'MEMBER'
          );

          this.applyFilters(false);

          if (this.selectedUser) {
            this.selectedUser =
              this.users.find(
                user => user.userId === this.selectedUser?.userId
              ) ?? null;
          }
        },
        error: error => {
          console.error(error);
          this.errorMessage =
            error?.error?.error ??
            'Không tải được danh sách người dùng. Hãy kiểm tra API và quyền ADMIN.';
        }
      });
  }

  roleOf(user: UserResponse): string {
    const raw = String(
      user.roleName ?? user['role'] ?? ''
    ).toUpperCase();

    if (raw.includes('ADMIN')) {
      return 'ADMIN';
    }

    if (raw.includes('MANAGER') || raw.includes('LEADER')) {
      return 'MANAGER';
    }

    if (raw.includes('MEMBER')) {
      return 'MEMBER';
    }

    const id = Number(user.roleId ?? user['roleId']);

    // Sửa các ID này nếu bảng roles của bạn dùng ID khác.
    if (id === 1) return 'ADMIN';
    if (id === 2) return 'MANAGER';
    if (id === 3) return 'MEMBER';

    return raw || 'UNKNOWN';
  }

  statusOf(user: UserResponse): string {
    return String(
      user.status ?? user['userStatus'] ?? 'UNKNOWN'
    ).toUpperCase();
  }

  roleIdOf(user: UserResponse): number {
    const id = Number(user.roleId ?? user['roleId']);

    if (id) {
      return id;
    }

    const roleIds: Record<string, number> = {
      ADMIN: 1,
      MANAGER: 2,
      MEMBER: 3
    };

    return roleIds[this.roleOf(user)] ?? 3;
  }

  applyFilters(resetPage = true): void {
    if (resetPage) {
      this.page = 0;
    }

    const key = this.keyword.trim().toLowerCase();

    const result = this.users.filter(user => {
      const matchesKeyword =
        !key ||
        String(user.username ?? '').toLowerCase().includes(key) ||
        String(user.fullName ?? '').toLowerCase().includes(key) ||
        String(user.email ?? '').toLowerCase().includes(key) ||
        String(user.userId ?? '').includes(key);

      const matchesRole =
        !this.filterRole || this.roleOf(user) === this.filterRole;

      const matchesStatus =
        !this.filterStatus ||
        this.statusOf(user) === this.filterStatus;

      return matchesKeyword && matchesRole && matchesStatus;
    });

    this.totalElements = result.length;

    if (this.page >= this.totalPages) {
      this.page = Math.max(0, this.totalPages - 1);
    }

    const start = this.page * this.pageSize;
    this.filteredUsers = result.slice(start, start + this.pageSize);
  }

  resetFilters(): void {
    this.keyword = '';
    this.filterRole = '';
    this.filterStatus = '';
    this.page = 0;

    this.applyFilters(false);
  }

  changePageSize(size: number): void {
    this.pageSize = Number(size);
    this.page = 0;
    this.applyFilters(false);
  }

  previousPage(): void {
    if (this.page > 0) {
      this.page--;
      this.applyFilters(false);
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages - 1) {
      this.page++;
      this.applyFilters(false);
    }
  }

  selectUser(user: UserResponse): void {
    this.selectedUser = user;
    this.showForm = false;
  }

  startCreate(): void {
    this.form = {
      username: '',
      email: '',
      password: '',
      roleId: 3
    };

    this.showForm = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  startEdit(user: UserResponse): void {
    this.errorMessage =
      'Backend hiện chưa có API cập nhật username/email/mật khẩu. Bạn vẫn có thể đổi vai trò hoặc trạng thái.';
    this.selectedUser = user;
  }

  cancelForm(): void {
    this.showForm = false;
    this.errorMessage = '';
  }

  saveUser(): void {
    if (
      !this.form.username.trim() ||
      !this.form.email.trim() ||
      !this.form.password
    ) {
      this.errorMessage =
        'Vui lòng nhập username, email và mật khẩu.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.userService
      .create(this.form)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.showForm = false;
          this.successMessage = 'Tạo tài khoản thành công.';
          this.refresh();
        },
        error: error => {
          console.error(error);
          this.errorMessage =
            error?.error?.error ??
            'Không thể tạo tài khoản. Hãy kiểm tra UserCreateRequest của backend.';
        }
      });
  }

  changeRole(user: UserResponse, event: Event): void {
    const roleName = (event.target as HTMLSelectElement).value;

    const roleIds: Record<string, number> = {
      ADMIN: 1,
      MANAGER: 2,
      MEMBER: 3
    };

    const roleId = roleIds[roleName];

    if (!roleId || !user.userId) {
      return;
    }

    this.userService.changeRole(user.userId, roleId).subscribe({
      next: () => {
        this.successMessage = 'Cập nhật vai trò thành công.';
        this.errorMessage = '';
        this.refresh();
      },
      error: error => {
        this.errorMessage =
          error?.error?.error ?? 'Không thể cập nhật vai trò.';
        this.refresh();
      }
    });
  }

  toggleStatus(user: UserResponse): void {
    const nextStatus =
      this.statusOf(user) === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    this.userService
      .changeStatus(user.userId, nextStatus)
      .subscribe({
        next: () => {
          this.successMessage = 'Cập nhật trạng thái thành công.';
          this.errorMessage = '';
          this.refresh();
        },
        error: error => {
          this.errorMessage =
            error?.error?.error ??
            'Không thể cập nhật trạng thái.';
        }
      });
  }

  selectManager(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;

    this.selectedManagerId = value ? Number(value) : null;

    this.selectedMemberIds = [];
    this.selectedProjectIds = [];
    this.assignedMemberIds = [];
    this.assignedProjectIds = [];

    if (!this.selectedManagerId) {
      return;
    }

    this.loadAssignments();
  }

  loadAssignments(): void {
    const managerId = this.selectedManagerId;

    if (!managerId) {
      return;
    }

    this.userService.getManagerMembers(managerId).subscribe({
      next: ids => {
        this.assignedMemberIds = ids ?? [];
        this.selectedMemberIds = [...this.assignedMemberIds];
      },
      error: error => {
        console.error('Load manager members failed', error);
      }
    });

    this.userService.getManagerProjects(managerId).subscribe({
      next: ids => {
        this.assignedProjectIds = ids ?? [];
        this.selectedProjectIds = [...this.assignedProjectIds];
      },
      error: error => {
        console.error('Load manager projects failed', error);
      }
    });
  }

  toggleMember(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    this.selectedMemberIds = checked
      ? [...new Set([...this.selectedMemberIds, id])]
      : this.selectedMemberIds.filter(item => item !== id);
  }

  toggleProject(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    this.selectedProjectIds = checked
      ? [...new Set([...this.selectedProjectIds, id])]
      : this.selectedProjectIds.filter(item => item !== id);
  }

  saveMembers(): void {
    if (!this.selectedManagerId) {
      return;
    }

    this.saving = true;

    this.userService
      .assignMembers(this.selectedManagerId, this.selectedMemberIds)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'Lưu phân công Member thành công.';
          this.loadAssignments();
        },
        error: error => {
          this.errorMessage =
            error?.error?.message ??
            'Không thể phân công Member.';
        }
      });
  }

  saveProjects(): void {
    if (!this.selectedManagerId) {
      return;
    }

    this.saving = true;

    this.userService
      .assignProjects(this.selectedManagerId, this.selectedProjectIds)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'Lưu phân công Project thành công.';
          this.loadAssignments();
        },
        error: error => {
          this.errorMessage =
            error?.error?.message ??
            'Không thể phân công Project.';
        }
      });
  }

  removeMember(id: number): void {
    if (!this.selectedManagerId) {
      return;
    }

    this.userService
      .removeMember(this.selectedManagerId, id)
      .subscribe({
        next: () => {
          this.successMessage = 'Đã thu hồi phân công Member.';
          this.loadAssignments();
        },
        error: () => {
          this.errorMessage = 'Không thể thu hồi Member.';
        }
      });
  }

  removeProject(id: number): void {
    if (!this.selectedManagerId) {
      return;
    }

    this.userService
      .removeProject(this.selectedManagerId, id)
      .subscribe({
        next: () => {
          this.successMessage = 'Đã thu hồi phân công Project.';
          this.loadAssignments();
        },
        error: () => {
          this.errorMessage = 'Không thể thu hồi Project.';
        }
      });
  }

  userNameById(id: number): string {
    const user = this.users.find(item => item.userId === id);

    return user
      ? user.fullName || user.username
      : `Member #${id}`;
  }

  projectNameById(id: number): string {
    return (
      this.projects.find(project => project.projectId === id)
        ?.projectName ?? `Project #${id}`
    );
  }

  statusLabel(status: string): string {
    if (status === 'ACTIVE') {
      return 'Đang hoạt động';
    }

    if (status === 'INACTIVE') {
      return 'Ngừng hoạt động';
    }

    return status;
  }

  statusClass(status: string): string {
    return status === 'ACTIVE'
      ? 'status-active'
      : 'status-inactive';
  }

  trackUser(_: number, user: UserResponse): number {
    return user.userId;
  }
}
