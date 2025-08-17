import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { Expense, ExpenseResponse, ExpenseCategory } from '../entity/expense';
import { environment } from '../../../environments/environment';

interface ApiError {
  error?: string;
  description?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExpenseService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/expense';
  private categoryApiUrl = environment.apiUrl + '/expense-category';

  async createExpense(expense: Expense): Promise<ExpenseResponse> {
    try {
      const response$ = this.http.post<ExpenseResponse>(this.apiUrl, expense);
      const result = await firstValueFrom(response$);

      console.log('Despesa criada com sucesso');
      return result;

    } catch (error) {
      console.error('Erro ao criar despesa:', error);

      if (this.isHttpErrorResponse(error)) {
        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao criar despesa';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao criar despesa');
    }
  }

  async getAllExpenses(): Promise<ExpenseResponse[]> {
    try {
      const response$ = this.http.get<ExpenseResponse[]>(this.apiUrl);
      return await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao buscar despesas:', error);

      if (this.isHttpErrorResponse(error)) {
        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao buscar despesas';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao buscar despesas');
    }
  }

  async getExpenseById(id: number): Promise<ExpenseResponse> {
    try {
      const response$ = this.http.get<ExpenseResponse>(`${this.apiUrl}/${id}`);
      return await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao buscar despesa:', error);

      if (this.isHttpErrorResponse(error)) {
        if (error.status === 404) {
          throw new Error('Despesa não encontrada');
        }

        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao buscar despesa';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao buscar despesa');
    }
  }

  async updateExpense(id: number, expense: Expense): Promise<ExpenseResponse> {
    try {
      const response$ = this.http.put<ExpenseResponse>(`${this.apiUrl}/${id}`, expense);
      return await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao atualizar despesa:', error);

      if (this.isHttpErrorResponse(error)) {
        if (error.status === 404) {
          throw new Error('Despesa não encontrada');
        }
        if (error.status === 403) {
          throw new Error('Você não tem permissão para editar esta despesa');
        }

        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao atualizar despesa';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao atualizar despesa');
    }
  }

  async deleteExpense(id: number): Promise<void> {
    try {
      const response$ = this.http.delete<void>(`${this.apiUrl}/${id}`);
      await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao deletar despesa:', error);

      if (this.isHttpErrorResponse(error)) {
        if (error.status === 404) {
          throw new Error('Despesa não encontrada');
        }
        if (error.status === 403) {
          throw new Error('Você não tem permissão para deletar esta despesa');
        }

        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao deletar despesa';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao deletar despesa');
    }
  }

  async getExpensesByPeriod(startDate: string, endDate: string): Promise<ExpenseResponse[]> {
    try {
      const params = { startDate, endDate };
      const response$ = this.http.get<ExpenseResponse[]>(`${this.apiUrl}/period`, { params });
      return await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao buscar despesas por período:', error);

      if (this.isHttpErrorResponse(error)) {
        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao buscar despesas';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao buscar despesas');
    }
  }

  // Métodos para categorias
  async getAllCategories(): Promise<ExpenseCategory[]> {
    try {
      const response$ = this.http.get<ExpenseCategory[]>(this.categoryApiUrl);
      return await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao buscar categorias:', error);

      if (this.isHttpErrorResponse(error)) {
        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao buscar categorias';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao buscar categorias');
    }
  }

  async createCategory(category: ExpenseCategory): Promise<ExpenseCategory> {
    try {
      const response$ = this.http.post<ExpenseCategory>(this.categoryApiUrl, category);
      const result = await firstValueFrom(response$);
      return result;

    } catch (error) {
      console.error('Erro ao criar categoria:', error);

      if (this.isHttpErrorResponse(error)) {
        const apiError = error.error as ApiError;

        // Tratamento especial para erros de duplicação
        if (error.status === 409) {
          throw new Error('Já existe uma categoria com este nome');
        }

        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao criar categoria';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao criar categoria');
    }
  }
  private isHttpErrorResponse(error: unknown): error is HttpErrorResponse {
    return error instanceof HttpErrorResponse;
  }
}