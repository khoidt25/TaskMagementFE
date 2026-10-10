
import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef, ElementRef} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription, finalize, timeout } from 'rxjs';

import { TaskAssignmentService } from '../../services/task-assignment.service';
import { ProjectService } from '../../services/project.service';
import { CustomerService } from '../../services/customer.service';
import { TaskItem } from '../../services/task-assignment.service';

interface UserItem {
  userId: number;
  username: string;
  fullName: string;
  email?: string;
  userStatus: string;
  roleCode?: string;
}

interface MemberItem {
  taskMemberId: number;
  taskId: number;
  taskCode?: string;
  taskName?: string;
  userId: number;
  username?: string;
  fullName?: string;
  taskRoleId: number;
  roleCode?: string;
  roleName?: string;
  assignedWork: string;
  status: string;
  progress: number;
  deadline?: string;
  note?: string;
  assignedBy?: number;
}

interface Project {
  projectId: number;
  projectName: string;
}

interface Customer {
  customerId: number;
  customerCode: string;
  customerName: string;
  description?: string;
  customerStatus: 'ACTIVE' | 'INACTIVE';
}

@Component({
  selector: 'app-task-assignment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './task-assignment.component.html',
  styleUrl: './task-assignment.component.css'
})
export class TaskAssignmentComponent implements OnInit {

  private taskRequest?: Subscription;
  private memberRequest?: Subscription;

  private taskRequestId = 0;
  private memberRequestId = 0;

  tasks: TaskItem[] = [];
  users: UserItem[] = [];
  members: MemberItem[] = [];

  projects: Project[] = [];
  customers: Customer[] = [];
  selectedCustomerId: number | null = null;


  selectedTaskId: number | null = null;

  searchTask = '';
  searchMember = '';

  taskPage = 0;
  taskSize = 10;
  totalTasks = 0;
  totalPages = 0;

  loadingTasks = false;
  loadingUsers = false;
  loadingMembers = false;
  saving = false;

  

  editingMemberId: number | null = null;

  errorMessage = '';
  successMessage = '';

  username = 'admin';

  readonly statuses = [
    { value: 'NOT_STARTED', label: 'Chưa bắt đầu' },
    { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
    { value: 'PENDING', label: 'Tạm hoãn' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'CANCELLED', label: 'Đã hủy' }
  ];

  filterStatus = '';

  filterProjectId: number | null = null;
  filterCustomerId: number | null = null;
  filterUserId: number | null = null;
  filterDeadlineFrom = '';
  filterDeadlineTo = '';

sortOption = 'taskId,desc';

  form = this.emptyForm();

  constructor(
    private taskService: TaskAssignmentService,
    private projectService: ProjectService,
    private customerService: CustomerService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadTasks();
    this.loadUsers();
    this.loadProjectOptions();
    this.loadCustomers();
  }

  private emptyForm() {
    return {
      userId: null as number | null,
      taskRoleId: null as number | null,
      assignedWork: '',
      status: 'NOT_STARTED',
      progress: 0,
      deadline: '',
      note: ''
    };
  }

  get selectedTask(): TaskItem | undefined {
    return this.tasks.find(
      task => task.taskId === this.selectedTaskId
    );
  }

  get activeUsers(): UserItem[] {
    return this.users.filter(
      user => (user.userStatus || '').toUpperCase() === 'ACTIVE'
    );
  }

  loadProjectOptions(): void {
  this.projectService.getOptions().subscribe({
    next: (data) => {
      this.projects = data;
    },
    error: (error) => {
      console.error('Lỗi tải danh sách Project:', error);
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

  get filteredTasks(): TaskItem[] {
    return this.tasks;
  }

  get filteredMembers(): MemberItem[] {
    const keyword = this.searchMember.trim().toLowerCase();

    if (!keyword) {
      return this.members;
    }

    return this.members.filter(member =>
      `${member.fullName || ''} ${member.username || ''} ${member.assignedWork || ''}`
        .toLowerCase()
        .includes(keyword)
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

  get totalProgress(): number {
    if (!this.members.length) {
      return 0;
    }

    const sum = this.members.reduce(
      (total, member) =>
        total + (Number(member.progress) || 0),
      0
    );

    return Math.round(sum / this.members.length);
  }

  get membersInProgress(): number {
    return this.members.filter(
      member => member.status === 'IN_PROGRESS'
    ).length;
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

  searchTasks(): void {
    this.taskPage = 0;
    this.loadTasks();
  }

  


loadTasks(): void {
  const requestId = ++this.taskRequestId;

  // Hủy request cũ
  this.taskRequest?.unsubscribe();

  this.loadingTasks = true;
  this.errorMessage = '';
  this.cdr.detectChanges();

  const filters = {
    page: this.taskPage,
    size: this.taskSize,
    keyword: this.searchTask.trim(),
    status: this.filterStatus || '',
    projectId: this.filterProjectId,
    customerId: this.filterCustomerId,
    userId: this.filterUserId,
    deadlineFrom: this.filterDeadlineFrom || '',
    deadlineTo: this.filterDeadlineTo || '',
    sort: this.sortOption
  };

  this.taskRequest = this.taskService
    .filterTasks(filters)
    .pipe(
      timeout({ first: 15000 }),
      finalize(() => {
        // Request cũ không được sửa trạng thái request mới
        if (requestId === this.taskRequestId) {
          this.loadingTasks = false;
          this.cdr.detectChanges();
        }
      })
    )
    .subscribe({
      next: response => {
        if (requestId !== this.taskRequestId) {
          return;
        }

        this.tasks = response?.content ?? [];
        this.totalTasks = response?.totalElements ?? 0;
        this.totalPages = response?.totalPages ?? 0;

        const selectedExists = this.tasks.some(
          task => task.taskId === this.selectedTaskId
        );

        if (!selectedExists) {
          this.selectedTaskId = this.tasks[0]?.taskId ?? null;
          this.cancelEdit();
        }

        if (this.selectedTaskId !== null) {
          this.loadMembers(this.selectedTaskId);
        } else {
          ++this.memberRequestId;
          this.memberRequest?.unsubscribe();
          this.memberRequest = undefined;
          this.members = [];
          this.loadingMembers = false;
        }

        this.cdr.detectChanges();
      },
      error: err => {
        if (requestId !== this.taskRequestId) {
          return;
        }

        console.error('Lỗi API lọc công việc:', err);

        this.tasks = [];
        this.members = [];
        this.selectedTaskId = null;
        this.totalTasks = 0;
        this.totalPages = 0;

        this.errorMessage =
          err?.name === 'TimeoutError'
            ? 'API tìm kiếm quá 15 giây. Hãy thử lại.'
            : err?.status === 0
              ? 'Không kết nối được backend. Kiểm tra Spring Boot và mạng.'
              : err?.error?.message ||
                `Không tải được công việc (HTTP ${err?.status ?? 'unknown'}).`;

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


  goToPage(page: number): void {
    if (
      page < 0 ||
      page >= this.totalPages ||
      page === this.taskPage ||
      this.loadingTasks
    ) {
      return;
    }

    this.taskPage = page;
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
  if (this.loadingTasks || this.taskPage >= this.totalPages - 1) {
    return;
  }

  this.taskPage++;
  this.loadTasks();
}

changePageSize(size: number): void {
  if (this.loadingTasks || this.taskSize === Number(size)) {
    return;
  }

  this.taskSize = Number(size);
  this.taskPage = 0;
  this.loadTasks();
}

selectTask(task: TaskItem): void {
  if (this.selectedTaskId === task.taskId) {
    return;
  }

  this.selectedTaskId = task.taskId;
  this.members = [];
  this.searchMember = '';

  this.cancelEdit();
  this.clearMessages();

  this.loadMembers(task.taskId);
}

  loadUsers(): void {
    this.loadingUsers = true;

    this.taskService
      .getUsers()
      .pipe(finalize(() => this.loadingUsers = false))
      .subscribe({
        next: response => {
          this.users = Array.isArray(response)
            ? response
            : response?.content ?? [];
        },
        error: () => {
          this.errorMessage = 'Không tải được danh sách người dùng.';
        }
      });
  }


loadMembers(taskId: number): void {
  const requestId = ++this.memberRequestId;

  this.memberRequest?.unsubscribe();

  this.loadingMembers = true;
  this.members = [];
  this.cdr.detectChanges();

  this.memberRequest = this.taskService
    .getMembers(taskId)
    .pipe(
      timeout({ first: 15000 }),
      finalize(() => {
        if (requestId === this.memberRequestId) {
          this.loadingMembers = false;
          this.cdr.detectChanges();
        }
      })
    )
    .subscribe({
      next: response => {
        if (
          requestId !== this.memberRequestId ||
          this.selectedTaskId !== taskId
        ) {
          return;
        }

        this.members = Array.isArray(response)
          ? response
          : response?.content ?? [];

        this.cdr.detectChanges();
      },
      error: err => {
        if (
          requestId !== this.memberRequestId ||
          this.selectedTaskId !== taskId
        ) {
          return;
        }

        this.members = [];

        this.errorMessage =
          err?.name === 'TimeoutError'
            ? 'API tải thành viên quá 15 giây.'
            : err?.error?.message ||
              'Không tải được danh sách thành viên.';

        this.cdr.detectChanges();
      }
    });
}


  submitAssignment(): void {
    if (this.selectedTaskId === null) {
      this.errorMessage = 'Vui lòng chọn một công việc.';
      return;
    }

    if (!this.form.userId) {
      this.errorMessage = 'Vui lòng chọn thành viên cần phân công.';
      return;
    }

    if (!this.form.taskRoleId) {
      this.errorMessage = 'Vui lòng nhập ID vai trò trong công việc.';
      return;
    }

    if (!this.form.assignedWork.trim()) {
      this.errorMessage = 'Vui lòng nhập nội dung công việc được giao.';
      return;
    }

    if (
      this.form.progress < 0 ||
      this.form.progress > 100
    ) {
      this.errorMessage = 'Tiến độ phải nằm trong khoảng 0–100%.';
      return;
    }

    const taskId = this.selectedTaskId;
    const editingId = this.editingMemberId;

    const body = {
      taskId,
      userId: Number(this.form.userId),
      taskRoleId: Number(this.form.taskRoleId),
      assignedWork: this.form.assignedWork.trim(),
      status: this.form.status,
      progress: Number(this.form.progress),
      deadline: this.form.deadline || null,
      note: this.form.note.trim() || null
    };

    this.saving = true;
    this.clearMessages();

    const request = editingId !== null
      ? this.taskService.updateMember(taskId, editingId, body)
      : this.taskService.assignMember(taskId, body);

    request
      .pipe(finalize(() => this.saving = false))
      .subscribe({
        next: () => {
          this.successMessage = editingId !== null
            ? 'Cập nhật phân công thành công.'
            : 'Phân công thành viên thành công.';

          this.cancelEdit();
          this.loadMembers(taskId);
        },
        error: err => {
          this.errorMessage =
            err?.error?.message ||
            err?.error?.error ||
            'Không thể lưu phân công. Kiểm tra dữ liệu và API backend.';
        }
      });
  }

  editMember(member: MemberItem): void {
    this.editingMemberId = member.taskMemberId;

    this.form = {
      userId: member.userId,
      taskRoleId: member.taskRoleId,
      assignedWork: member.assignedWork || '',
      status: member.status || 'NOT_STARTED',
      progress: Number(member.progress) || 0,
      deadline: member.deadline || '',
      note: member.note || ''
    };

    this.clearMessages();
  }

  deleteMember(member: MemberItem): void {
    const taskId = this.selectedTaskId;

    if (taskId === null) {
      return;
    }

    const name =
      member.fullName || member.username || 'thành viên';

    if (!confirm(`Bạn có chắc muốn xóa phân công của ${name}?`)) {
      return;
    }

    this.clearMessages();

    this.taskService
      .deleteMember(taskId, member.taskMemberId)
      .subscribe({
        next: () => {
          this.successMessage = 'Đã xóa phân công thành công.';

          if (this.editingMemberId === member.taskMemberId) {
            this.cancelEdit();
          }

          this.loadMembers(taskId);
        },
        error: err => {
          this.errorMessage =
            err?.error?.message || 'Không thể xóa phân công.';
        }
      });
  }

  cancelEdit(): void {
    this.editingMemberId = null;
    this.form = this.emptyForm();
    this.clearMessages();
  }

  startNewAssignment(): void {
    this.cancelEdit();
    setTimeout(() => {
    document.getElementById('assignment-form')
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  } 

  refresh(): void {
    this.clearMessages();
    this.loadTasks();
    this.loadUsers();
  }

  logout(): void {
    this.router.navigate(['/login']);
  }

  statusLabel(status: string): string {
    return this.statuses.find(
      item => item.value === status
    )?.label || status;
  }

  statusClass(status: string): string {
    return (status || 'NOT_STARTED')
      .toLowerCase()
      .replace('_', '-');
  }

  trackTask(_: number, task: TaskItem): number {
    return task.taskId;
  }

  trackMember(_: number, member: MemberItem): number {
    return member.taskMemberId;
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  priorityClass(priorityCode: string | null | undefined): string {
  switch ((priorityCode || '').toUpperCase()) {
    case 'LOW':
      return 'priority-low';
    case 'MEDIUM':
      return 'priority-medium';
    case 'HIGH':
      return 'priority-high';
    case 'URGENT':
      return 'priority-urgent';
    default:
      return 'priority-unknown';
  }
}

  ngOnDestroy(): void {
  // Vô hiệu hóa mọi callback đang chờ
    ++this.taskRequestId;
    ++this.memberRequestId;

    this.taskRequest?.unsubscribe();
    this.memberRequest?.unsubscribe();
  }
}
