import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MonthlyData {
  year: number;
  month: number;
  total: number;
}

export interface CategoryData {
  year: number;
  month: number;
  categoryId: number;
  categoryName: string;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/dashboard';

  async getMonthlyExpenses(year?: number): Promise<MonthlyData[]> {
    try {
      let params = new HttpParams();
      if (year) {
        params = params.set('year', year.toString());
      }
      
      const response$ = this.http.get<MonthlyData[]>(`${this.apiUrl}/expenses/monthly`, { params });
      return await firstValueFrom(response$);
    } catch (error) {
      console.error('Erro ao buscar despesas mensais:', error);
      return [];
    }
  }

  async getMonthlyIncomes(year?: number): Promise<MonthlyData[]> {
    try {
      let params = new HttpParams();
      if (year) {
        params = params.set('year', year.toString());
      }
      
      const response$ = this.http.get<MonthlyData[]>(`${this.apiUrl}/incomes/monthly`, { params });
      return await firstValueFrom(response$);
    } catch (error) {
      console.error('Erro ao buscar receitas mensais:', error);
      return [];
    }
  }

  async getExpensesByCategory(year?: number, month?: number): Promise<CategoryData[]> {
    try {
      let params = new HttpParams();
      if (year) {
        params = params.set('year', year.toString());
      }
      if (month) {
        params = params.set('month', month.toString());
      }
      
      const response$ = this.http.get<CategoryData[]>(`${this.apiUrl}/expenses/by-category`, { params });
      return await firstValueFrom(response$);
    } catch (error) {
      console.error('Erro ao buscar gastos por categoria:', error);
      return [];
    }
  }
}