import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, finalize, timeout } from 'rxjs';

import { SidebarComponent } from '../sidebar/sidebar';

import {
  Customer,
  CustomerPage,
  CustomerService
} from '../../services/customer.service';

type CustomerStatus = 'ACTIVE' | 'INACTIVE';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.css'
})
export class CustomersComponent implements OnInit, OnDestroy {
  private readonly customerService = inject(CustomerService);
  private readonly cdr = inject(ChangeDetectorRef);

  private customerRequest?: Subscription;
  private saveRequest?: Subscription;
  private deleteRequest?: Subscription;

  private requestId = 0;
  private destroyed = false;

  customers: Customer[] = [];
  selectedCustomer: Customer | null = null;

  loading = false;
  saving = false;
  deleting = false;
  showForm = false;
  editingCustomerId: number | null = null;

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

  form: Partial<Customer> = this.emptyForm();

  readonly statuses: {
    value: CustomerStatus;
    label: string;
  }[] = [
    { value: 'ACTIVE', label: 'Đang hoạt động' },
    { value: 'INACTIVE', label: 'Ngừng hoạt động' }
  ];

  ngOnInit(): void {
    this.loadCustomers();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.requestId++;

    this.customerRequest?.unsubscribe();
    this.saveRequest?.unsubscribe();
    this.deleteRequest?.unsubscribe();
  }

  private emptyForm(): Partial<Customer> {
    return {
      customerCode: '',
      customerName: '',
      description: '',
      customerStatus: 'ACTIVE'
    };
  }

  loadCustomers(): void {
    if (this.destroyed) {
      return;
    }

    const currentRequestId = ++this.requestId;

    this.customerRequest?.unsubscribe();

    this.loading = true;
    this.errorMessage = '';

    this.customerRequest = this.customerService
      .getCustomers(
        this.appliedKeyword,
        this.appliedStatus,
        this.page,
        this.pageSize
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
        next: (response: CustomerPage) => {
          if (
            this.destroyed ||
            currentRequestId !== this.requestId
          ) {
            return;
          }

          this.customers = response?.content ?? [];
          this.totalElements = response?.totalElements ?? 0;
          this.totalPages = response?.totalPages ?? 0;
          this.page = response?.number ?? this.page;

          this.syncSelectedCustomer();
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
            'Không thể tải danh sách khách hàng. Vui lòng thử lại.'
          );

          this.cdr.markForCheck();
        }
      });
  }

  refresh(): void {
    this.loadCustomers();
  }

  private syncSelectedCustomer(): void {
    if (!this.selectedCustomer) {
      return;
    }

    this.selectedCustomer =
      this.customers.find(
        customer =>
          customer.customerId === this.selectedCustomer?.customerId
      ) ?? null;
  }

  applyFilters(): void {
    this.appliedKeyword = this.keyword.trim();
    this.appliedStatus = this.filterStatus;
    this.page = 0;

    this.loadCustomers();
  }

  resetFilters(): void {
    this.keyword = '';
    this.filterStatus = '';
    this.appliedKeyword = '';
    this.appliedStatus = '';
    this.page = 0;

    this.loadCustomers();
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

    this.loadCustomers();
  }

  previousPage(): void {
    if (this.page > 0 && !this.loading) {
      this.page--;
      this.loadCustomers();
    }
  }

  nextPage(): void {
    if (
      this.page < this.totalPages - 1 &&
      !this.loading
    ) {
      this.page++;
      this.loadCustomers();
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
    return this.customers.filter(
      customer => customer.customerStatus === 'ACTIVE'
    ).length;
  }

  get inactiveCount(): number {
    return this.customers.filter(
      customer => customer.customerStatus === 'INACTIVE'
    ).length;
  }

  selectCustomer(customer: Customer): void {
    this.selectedCustomer = customer;
  }

  startCreateCustomer(): void {
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

    this.editingCustomerId = null;
    this.form = this.emptyForm();
    this.showForm = true;

    this.errorMessage = '';
    this.successMessage = '';
  }

  startEditCustomer(customer: Customer): void {
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

    this.editingCustomerId = customer.customerId;

    this.form = {
      customerCode: customer.customerCode,
      customerName: customer.customerName,
      description: customer.description ?? '',
      customerStatus: customer.customerStatus
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
    this.editingCustomerId = null;
    this.form = this.emptyForm();
    this.errorMessage = '';
  }

  saveCustomer(): void {
    if (this.saving) {
      return;
    }

    const customerCode = this.form.customerCode?.trim() ?? '';
    const customerName = this.form.customerName?.trim() ?? '';

    if (!customerCode || !customerName) {
      this.errorMessage = 'Vui lòng nhập mã và tên khách hàng.';
      return;
    }

    const payload: Partial<Customer> = {
      customerCode,
      customerName,
      description: this.form.description?.trim() ?? '',
      customerStatus: this.form.customerStatus ?? 'ACTIVE'
    };

    const customerId = this.editingCustomerId;
    const isEditing = customerId !== null;

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request = isEditing
      ? this.customerService.update(customerId!, payload)
      : this.customerService.create(payload);

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
        next: customer => {
          if (this.destroyed) {
            return;
          }

          this.showForm = false;
          this.editingCustomerId = null;
          this.form = this.emptyForm();

          this.successMessage = isEditing
            ? 'Cập nhật khách hàng thành công.'
            : 'Tạo khách hàng thành công.';

          this.selectedCustomer = customer ?? null;
          this.page = 0;

          this.loadCustomers();
          this.cdr.markForCheck();
        },
        error: error => {
          if (this.destroyed) {
            return;
          }

          this.errorMessage = this.getErrorMessage(
            error,
            'Không thể lưu khách hàng. Vui lòng kiểm tra dữ liệu.'
          );

          this.cdr.markForCheck();
        }
      });
  }

  deleteCustomer(customer: Customer): void {
    if (this.deleting) {
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn ngừng hoạt động khách hàng "${customer.customerName}"?`
    );

    if (!confirmed) {
      return;
    }

    this.deleting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.deleteRequest?.unsubscribe();

    this.deleteRequest = this.customerService
      .delete(customer.customerId)
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
            'Đã ngừng hoạt động khách hàng thành công.';

          if (
            this.selectedCustomer?.customerId === customer.customerId
          ) {
            this.selectedCustomer = null;
          }

          if (this.customers.length === 1 && this.page > 0) {
            this.page--;
          }

          this.loadCustomers();
          this.cdr.markForCheck();
        },
        error: error => {
          if (this.destroyed) {
            return;
          }

          this.errorMessage = this.getErrorMessage(
            error,
            'Không thể ngừng hoạt động khách hàng. Vui lòng thử lại.'
          );

          this.cdr.markForCheck();
        }
      });
  }

  statusLabel(status: CustomerStatus): string {
    return status === 'ACTIVE'
      ? 'Đang hoạt động'
      : 'Ngừng hoạt động';
  }

  statusClass(status: CustomerStatus): string {
    return status === 'ACTIVE'
      ? 'status-active'
      : 'status-inactive';
  }

  trackCustomer(_index: number, customer: Customer): number {
    return customer.customerId;
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
