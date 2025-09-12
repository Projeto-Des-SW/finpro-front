import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Income } from '../entity/income';
import { environment } from '../../../environments/environment.prod';

interface ApiError {
  error?: string;
  description?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class IncomeService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/income';
  
  async createIncome(income: Income): Promise<Income> {
    try {
      const response$ = this.http.post<Income>(this.apiUrl, income);
      const result = await firstValueFrom(response$);
      
      console.log('Receita criada com sucesso');
      return result;
      
    } catch (error) {
      console.error('Erro ao criar receita:', error);
      
      if (this.isHttpErrorResponse(error)) {
        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description || 
                            apiError?.message || 
                            'Erro ao criar receita';
        
        throw new Error(errorMessage);
      }
      
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      
      throw new Error('Erro ao criar receita');
    }
  }

  async getAllIncomes(): Promise<Income[]> {
    try {
      console.log('Tentando buscar receitas...');
      const token = localStorage.getItem('token');
      console.log('Token no localStorage:', token ? 'Existe' : 'Não existe');
      
      const response$ = this.http.get<Income[]>(this.apiUrl);
      const result = await firstValueFrom(response$);
      
      console.log("Receitas carregadas:", result);
      return result;
      
    } catch (error) {
      console.error('Erro ao buscar receitas:', error);
      
      if (this.isHttpErrorResponse(error)) {
        console.log('Status do erro:', error.status);
        console.log('URL do erro:', error.url);
        console.log('Detalhes do erro:', error.error);
        
        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description || 
                            apiError?.message || 
                            'Erro ao buscar receitas';
        
        throw new Error(errorMessage);
      }
      
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      
      throw new Error('Erro ao buscar receitas');
    }
  }

  async getIncomeById(id: number): Promise<Income> {
    try {
      const response$ = this.http.get<Income>(`${this.apiUrl}/${id}`);
      return await firstValueFrom(response$);
      
    } catch (error) {
      console.error('Erro ao buscar receita:', error);
      
      if (this.isHttpErrorResponse(error)) {
        if (error.status === 404) {
          throw new Error('Receita não encontrada');
        }
        
        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description || 
                            apiError?.message || 
                            'Erro ao buscar receita';
        
        throw new Error(errorMessage);
      }
      
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      
      throw new Error('Erro ao buscar receita');
    }
  }

  async updateIncome(id: number, income: Income): Promise<Income> {
    try {
      const response$ = this.http.put<Income>(`${this.apiUrl}/${id}`, income);
      return await firstValueFrom(response$);
      
    } catch (error) {
      console.error('Erro ao atualizar receita:', error);
      
      if (this.isHttpErrorResponse(error)) {
        if (error.status === 404) {
          throw new Error('Receita não encontrada');
        }
        if (error.status === 403) {
          throw new Error('Você não tem permissão para editar esta receita');
        }
        
        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description || 
                            apiError?.message || 
                            'Erro ao atualizar receita';
        
        throw new Error(errorMessage);
      }
      
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      
      throw new Error('Erro ao atualizar receita');
    }
  }

  async deleteIncome(id: number): Promise<void> {
    try {
      const response$ = this.http.delete<void>(`${this.apiUrl}/${id}`);
      await firstValueFrom(response$);
      
    } catch (error) {
      console.error('Erro ao deletar receita:', error);
      
      if (this.isHttpErrorResponse(error)) {
        if (error.status === 404) {
          throw new Error('Receita não encontrada');
        }
        if (error.status === 403) {
          throw new Error('Você não tem permissão para deletar esta receita');
        }
        
        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description || 
                            apiError?.message || 
                            'Erro ao deletar receita';
        
        throw new Error(errorMessage);
      }
      
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      
      throw new Error('Erro ao deletar receita');
    }
  }

  async getIncomesByPeriod(startDate: string, endDate: string): Promise<Income[]> {
    try {
      const params = { startDate, endDate };
      const response$ = this.http.get<Income[]>(`${this.apiUrl}/period`, { params });
      return await firstValueFrom(response$);
      
    } catch (error) {
      console.error('Erro ao buscar receitas por período:', error);
      
      if (this.isHttpErrorResponse(error)) {
        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description || 
                            apiError?.message || 
                            'Erro ao buscar receitas';
        
        throw new Error(errorMessage);
      }
      
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      
      throw new Error('Erro ao buscar receitas');
    }
  }

  private isHttpErrorResponse(error: unknown): error is HttpErrorResponse {
    return error instanceof HttpErrorResponse;
  }
}