
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Customer {
  customerId: number;
  customerCode: string;
  customerName: string;
  description?: string | null;
  customerStatus: 'ACTIVE' | 'INACTIVE';
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CustomerPage {
  content: Customer[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8081/api/customers';

  findAll(): Observable<Customer[]> {
     return this.http.get<Customer[]>(`${this.apiUrl}/all`);
  }

  getCustomers(
    keyword: string,
    status: string,
    page: number,
    size: number
  ): Observable<CustomerPage> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (keyword.trim()) {
      params = params.set('keyword', keyword.trim());
    }

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<CustomerPage>(this.apiUrl, { params });
  }

  getById(id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.apiUrl}/${id}`);
  }

  create(customer: Partial<Customer>): Observable<Customer> {
    return this.http.post<Customer>(this.apiUrl, customer);
  }

  update(
    id: number,
    customer: Partial<Customer>
  ): Observable<Customer> {
    return this.http.put<Customer>(
      `${this.apiUrl}/${id}`,
      customer
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
