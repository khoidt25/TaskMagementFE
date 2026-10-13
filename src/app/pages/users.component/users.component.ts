import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Subscription, timeout } from 'rxjs';

import { SidebarComponent } from '../sidebar/sidebar';
import {
  UserAdminService,
  UserResponse
} from '../../services/user-admin.service';

interface UserForm {
  userId?: number;
  username: string;
  email: string;
  password: string;
  roleId: number;
}

interface ProjectResponse {
  projectId: number;
  projectName: string;
}

type UserStatus = 'ACTIVE' | 'INACTIVE';
type UserRole = 'ADMIN' | 'MANAGER' | 'MEMBER';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent implements OnInit, OnDestroy {
  private readonly userService = inject(UserAdminService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();

  users: UserResponse[] = [];
  filteredUsers: UserResponse[] = [];
  managers: UserResponse[] = [];
  members: UserResponse[] = [];
  projects: ProjectResponse[] = [];

  selectedUser: UserResponse | null = null;
  selectedManagerId: number | null = null;

  // Tab
  activeTab: 'users' | 'assignments' = 'users';

  // Trạng thái giao diện
  loading = false;
  saving = false;
  deleting = false;
  showForm = false;
  isEditMode = false;

  errorMessage = '';
  successMessage = '';

  // Bộ lọc
  keyword = '';
  filterRole = '';
  filterStatus = '';

  // Phân trang, dùng phân trang phía frontend vì API hiện tại
  // GET /api/users/all trả về danh sách List<UserResponse>.
  page = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  // Phân công Manager
  selectedMemberIds: number[] = [];
  selectedProjectIds: number[] = [];

  assignedMemberIds: number[] = [];
  assignedProjectIds: number[] = [];

  form: UserForm = this.emptyForm();

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private emptyForm(): UserForm {
    return {
      username: '',
      email: '',
      password: '',
      roleId: 3
    };
  }

  // =========================
  // TẢI DỮ LIỆU NGƯỜI DÙNG
  // =========================

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';

    const sub = this.userService.getAll()
      .pipe(
        timeout(15000),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response: any) => {
          // Hỗ trợ cả List<UserResponse> và response có content.
          const list: UserResponse[] = Array.isArray(response)
            ? response
            : Array.isArray(response?.content)
              ? response.content
              : [];

          this.users = list;

          this.managers = list.filter(
            user => this.normalizeRole(this.roleOf(user)) === 'MANAGER'
          );

          this.members = list.filter(
            user => this.normalizeRole(this.roleOf(user)) === 'MEMBER'
          );

          // Nếu tài khoản đang chọn không còn trong danh sách, bỏ chọn.
          if (this.selectedUser) {
            this.selectedUser =
              list.find(u => u.userId === this.selectedUser?.userId) ?? null;
          }

          this.applyFilters();
        },
        error: (error: unknown) => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Không thể tải danh sách người dùng.'
          );
        }
      });

    this.subscriptions.add(sub);
  }

  refresh(): void {
    this.loadUsers();
  }

  // =========================
  // THỐNG KÊ
  // =========================

  get activeUsersCount(): number {
    return this.users.filter(
      user => this.statusOf(user) === 'ACTIVE'
    ).length;
  }

  get activeCount(): number {
    return this.activeUsersCount;
  }

  get inactiveCount(): number {
    return this.users.filter(
      user => this.statusOf(user) === 'INACTIVE'
    ).length;
  }

  // =========================
  // VAI TRÒ VÀ TRẠNG THÁI
  // =========================

  roleOf(user: UserResponse): string {
    const item = user as any;

    const value =
      item.roleName ??
      item.role?.roleName ??
      item.role?.name ??
      item.role ??
      item.roleCode ??
      '';

    const role = String(value).toUpperCase();

    if (role.includes('ADMIN')) {
      return 'ADMIN';
    }

    if (role.includes('MANAGER')) {
      return 'MANAGER';
    }

    if (role.includes('MEMBER')) {
      return 'MEMBER';
    }

    // Dùng roleId nếu backend không trả roleName.
    const roleId = Number(item.roleId ?? item.role?.roleId);

    if (roleId === 1) return 'ADMIN';
    if (roleId === 2) return 'MANAGER';
    if (roleId === 3) return 'MEMBER';

    return 'MEMBER';
  }

  private normalizeRole(value: string): UserRole {
    const role = value.toUpperCase();

    if (role === 'ADMIN') return 'ADMIN';
    if (role === 'MANAGER') return 'MANAGER';

    return 'MEMBER';
  }

  private getRoleId(user: UserResponse): number {
    const item = user as any;
    const roleId = Number(item.roleId ?? item.role?.roleId);

    if ([1, 2, 3].includes(roleId)) {
      return roleId;
    }

    switch (this.roleOf(user)) {
      case 'ADMIN':
        return 1;
      case 'MANAGER':
        return 2;
      default:
        return 3;
    }
  }

  statusOf(user: UserResponse): UserStatus {
    const item = user as any;
    const value = String(
      item.status ?? item.userStatus ?? item.accountStatus ?? 'ACTIVE'
    ).toUpperCase();

    return value === 'INACTIVE' || value === 'DISABLED'
      ? 'INACTIVE'
      : 'ACTIVE';
  }

  roleLabel(user: UserResponse): string {
    const role = this.roleOf(user);

    if (role === 'ADMIN') return 'Admin';
    if (role === 'MANAGER') return 'Manager';

    return 'Member';
  }

  statusLabel(status: string): string {
    return status === 'ACTIVE'
      ? 'Đang hoạt động'
      : 'Ngừng hoạt động';
  }

  roleClass(user: UserResponse): string {
    return this.roleOf(user).toLowerCase();
  }

  statusClass(status: string): string {
    return status === 'ACTIVE' ? 'active' : 'inactive';
  }

  // =========================
  // TÌM KIẾM VÀ PHÂN TRANG
  // =========================

  applyFilters(): void {
    const keyword = this.keyword.trim().toLowerCase();

    const result = this.users.filter(user => {
      const item = user as any;

      const matchesKeyword =
        !keyword ||
        String(item.userId ?? '').toLowerCase().includes(keyword) ||
        String(item.username ?? '').toLowerCase().includes(keyword) ||
        String(item.fullName ?? '').toLowerCase().includes(keyword) ||
        String(item.email ?? '').toLowerCase().includes(keyword);

      const matchesRole =
        !this.filterRole ||
        this.roleOf(user) === this.filterRole;

      const matchesStatus =
        !this.filterStatus ||
        this.statusOf(user) === this.filterStatus;

      return matchesKeyword && matchesRole && matchesStatus;
    });

    this.totalElements = result.length;
    this.totalPages = Math.max(
      1,
      Math.ceil(this.totalElements / this.pageSize)
    );

    if (this.page >= this.totalPages) {
      this.page = this.totalPages - 1;
    }

    if (this.page < 0) {
      this.page = 0;
    }

    const start = this.page * this.pageSize;

    this.filteredUsers = result.slice(
      start,
      start + this.pageSize
    );
  }

  resetFilters(): void {
    this.keyword = '';
    this.filterRole = '';
    this.filterStatus = '';
    this.page = 0;

    this.applyFilters();
  }

  changePageSize(size: number | string): void {
    this.pageSize = Number(size) || 10;
    this.page = 0;
    this.applyFilters();
  }

  previousPage(): void {
    if (this.page > 0) {
      this.page--;
      this.applyFilters();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages - 1) {
      this.page++;
      this.applyFilters();
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

  trackUser(_index: number, user: UserResponse): number {
    return user.userId;
  }

  // =========================
  // CHỌN NGƯỜI DÙNG
  // =========================

  selectUser(user: UserResponse): void {
    this.selectedUser = user;
    this.errorMessage = '';
    this.successMessage = '';
  }

  // =========================
  // TẠO NGƯỜI DÙNG
  // =========================

  startCreate(): void {
    this.isEditMode = false;
    this.showForm = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.form = this.emptyForm();
  }

  cancelForm(): void {
    this.showForm = false;
    this.isEditMode = false;
    this.form = this.emptyForm();
  }

  saveUser(): void {
    if (this.saving) return;

    if (this.isEditMode) {
      this.errorMessage =
        'Backend hiện chưa có API cập nhật username/email. ' +
        'Bạn vẫn có thể đổi vai trò tại mục Quản lý vai trò.';
      return;
    }

    const username = this.form.username.trim();
    const email = this.form.email.trim();

    if (!username || !email || !this.form.password) {
      this.errorMessage = 'Vui lòng nhập đầy đủ thông tin bắt buộc.';
      return;
    }

    if (this.form.password.length < 6) {
      this.errorMessage = 'Mật khẩu phải có ít nhất 6 ký tự.';
      return;
    }

    const payload = {
      username,
      email,
      password: this.form.password,
      roleId: Number(this.form.roleId)
    };

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const sub = this.userService.create(payload)
      .pipe(
        timeout(15000),
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.showForm = false;
          this.isEditMode = false;
          this.form = this.emptyForm();
          this.successMessage = 'Tạo tài khoản thành công.';
          this.page = 0;
          this.loadUsers();
        },
        error: (error: unknown) => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Không thể tạo tài khoản.'
          );
        }
      });

    this.subscriptions.add(sub);
  }

  // =========================
  // SỬA THÔNG TIN
  // =========================

  startEdit(user: UserResponse): void {
    this.selectedUser = user;
    this.isEditMode = true;
    this.showForm = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.form = {
      userId: user.userId,
      username: user.username ?? '',
      email: user.email ?? '',
      password: '',
      roleId: this.getRoleId(user)
    };

    this.errorMessage =
      'Bạn đang mở thông tin chỉnh sửa. Backend hiện chưa có API ' +
      'cập nhật username/email; chức năng lưu chỉnh sửa sẽ cần API PUT riêng.';
  }

  // =========================
  // ĐỔI VAI TRÒ
  // =========================

  changeRole(user: UserResponse, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const role = select.value;
    const roleIds: Record<string, number> = {
      ADMIN: 1,
      MANAGER: 2,
      MEMBER: 3
    };

    const roleId = roleIds[role];

    if (!roleId || role === this.roleOf(user)) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    const sub = this.userService.changeRole(user.userId, roleId)
      .pipe(
        timeout(15000),
        finalize(() => this.cdr.markForCheck())
      )
      .subscribe({
        next: () => {
          this.successMessage = 'Cập nhật vai trò thành công.';
          this.loadUsers();
        },
        error: (error: unknown) => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Không thể cập nhật vai trò.'
          );
          select.value = this.roleOf(user);
        }
      });

    this.subscriptions.add(sub);
  }

  // =========================
  // KHÓA / KÍCH HOẠT TÀI KHOẢN
  // =========================

  toggleStatus(user: UserResponse): void {
    if (this.deleting) return;

    const nextStatus: UserStatus =
      this.statusOf(user) === 'ACTIVE'
        ? 'INACTIVE'
        : 'ACTIVE';

    const actionText =
      nextStatus === 'ACTIVE' ? 'kích hoạt' : 'khóa';

    if (!window.confirm(`Bạn có chắc muốn ${actionText} tài khoản này?`)) {
      return;
    }

    this.deleting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const sub = this.userService.changeStatus(
      user.userId,
      nextStatus
    )
      .pipe(
        timeout(15000),
        finalize(() => {
          this.deleting = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.successMessage =
            nextStatus === 'ACTIVE'
              ? 'Kích hoạt tài khoản thành công.'
              : 'Khóa tài khoản thành công.';

          this.loadUsers();
        },
        error: (error: unknown) => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Không thể thay đổi trạng thái tài khoản.'
          );
        }
      });

    this.subscriptions.add(sub);
  }

  // =========================
  // PHÂN CÔNG MANAGER
  // =========================

  selectManager(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const id = Number(select.value);

    this.selectedManagerId = id > 0 ? id : null;

    this.selectedMemberIds = [];
    this.selectedProjectIds = [];
    this.assignedMemberIds = [];
    this.assignedProjectIds = [];

    this.errorMessage = '';
    this.successMessage = '';

    if (this.selectedManagerId !== null) {
      this.loadManagerAssignments(this.selectedManagerId);
    }
  }

  private loadManagerAssignments(managerId: number): void {
    const membersSub = this.userService.getManagerMembers(managerId)
      .pipe(timeout(15000))
      .subscribe({
        next: (response: any) => {
          const list = this.toArray(response);

          this.assignedMemberIds = list
            .map((item: any) => Number(
              typeof item === 'number'
                ? item
                : item.userId ?? item.memberId ?? item.id
            ))
            .filter((id: number) => id > 0);

          this.selectedMemberIds = [...this.assignedMemberIds];
          this.cdr.markForCheck();
        },
        error: (error: unknown) => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Không thể tải danh sách Member được phân công.'
          );
        }
      });

    const projectsSub = this.userService.getManagerProjects(managerId)
      .pipe(timeout(15000))
      .subscribe({
        next: (response: any) => {
          const list = this.toArray(response);

          this.assignedProjectIds = list
            .map((item: any) => Number(
              typeof item === 'number'
                ? item
                : item.projectId ?? item.id
            ))
            .filter((id: number) => id > 0);

          this.selectedProjectIds = [...this.assignedProjectIds];
          this.cdr.markForCheck();
        },
        error: (error: unknown) => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Không thể tải danh sách Project được phân công.'
          );
        }
      });

    this.subscriptions.add(membersSub);
    this.subscriptions.add(projectsSub);
  }

  private toArray(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.content)) return response.content;
    if (Array.isArray(response?.members)) return response.members;
    if (Array.isArray(response?.projects)) return response.projects;

    return [];
  }

  toggleMember(memberId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      if (!this.selectedMemberIds.includes(memberId)) {
        this.selectedMemberIds = [
          ...this.selectedMemberIds,
          memberId
        ];
      }
    } else {
      this.selectedMemberIds = this.selectedMemberIds.filter(
        id => id !== memberId
      );
    }
  }

  toggleProject(projectId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      if (!this.selectedProjectIds.includes(projectId)) {
        this.selectedProjectIds = [
          ...this.selectedProjectIds,
          projectId
        ];
      }
    } else {
      this.selectedProjectIds = this.selectedProjectIds.filter(
        id => id !== projectId
      );
    }
  }

  saveMembers(): void {
    if (!this.selectedManagerId || this.saving) return;

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const sub = this.userService.assignMembers(
      this.selectedManagerId,
      this.selectedMemberIds
    )
      .pipe(
        timeout(15000),
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.assignedMemberIds = [...this.selectedMemberIds];
          this.successMessage = 'Lưu phân công Member thành công.';
        },
        error: (error: unknown) => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Không thể lưu phân công Member.'
          );
        }
      });

    this.subscriptions.add(sub);
  }

  saveProjects(): void {
    if (!this.selectedManagerId || this.saving) return;

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const sub = this.userService.assignProjects(
      this.selectedManagerId,
      this.selectedProjectIds
    )
      .pipe(
        timeout(15000),
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.assignedProjectIds = [...this.selectedProjectIds];
          this.successMessage = 'Lưu phân công Project thành công.';
        },
        error: (error: unknown) => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Không thể lưu phân công Project.'
          );
        }
      });

    this.subscriptions.add(sub);
  }

  removeMember(memberId: number): void {
    if (!this.selectedManagerId) return;

    const sub = this.userService.removeMember(
      this.selectedManagerId,
      memberId
    )
      .pipe(
        timeout(15000),
        finalize(() => this.cdr.markForCheck())
      )
      .subscribe({
        next: () => {
          this.assignedMemberIds = this.assignedMemberIds.filter(
            id => id !== memberId
          );

          this.selectedMemberIds = this.selectedMemberIds.filter(
            id => id !== memberId
          );

          this.successMessage = 'Đã thu hồi phân công Member.';
        },
        error: (error: unknown) => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Không thể thu hồi phân công Member.'
          );
        }
      });

    this.subscriptions.add(sub);
  }

  removeProject(projectId: number): void {
    if (!this.selectedManagerId) return;

    const sub = this.userService.removeProject(
      this.selectedManagerId,
      projectId
    )
      .pipe(
        timeout(15000),
        finalize(() => this.cdr.markForCheck())
      )
      .subscribe({
        next: () => {
          this.assignedProjectIds = this.assignedProjectIds.filter(
            id => id !== projectId
          );

          this.selectedProjectIds = this.selectedProjectIds.filter(
            id => id !== projectId
          );

          this.successMessage = 'Đã thu hồi phân công Project.';
        },
        error: (error: unknown) => {
          this.errorMessage = this.getErrorMessage(
            error,
            'Không thể thu hồi phân công Project.'
          );
        }
      });

    this.subscriptions.add(sub);
  }

  userNameById(userId: number): string {
    const user = this.users.find(item => item.userId === userId);

    return user
      ? `${user.fullName || user.username} (#${userId})`
      : `Member #${userId}`;
  }

  projectNameById(projectId: number): string {
    const project = this.projects.find(
      item => item.projectId === projectId
    );

    return project
      ? project.projectName
      : `Project #${projectId}`;
  }

  // =========================
  // XỬ LÝ LỖI API
  // =========================

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
      return 'Bạn không có quyền thực hiện chức năng này.';
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
