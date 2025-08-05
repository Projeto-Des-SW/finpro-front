import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IncomeCategory {
  incomeCategoryId: number;
  name: string;
}

export interface IncomeCategoryCreate {
  name: string;
}

interface ApiError {
  error?: string;
  description?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class IncomeCategoryService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/income-category';

  async getAllCategories(): Promise<IncomeCategory[]> {
    try {
      console.log('🔍 Buscando todas as categorias de receita...');
      const response$ = this.http.get<IncomeCategory[]>(this.apiUrl);
      const result = await firstValueFrom(response$);
      
      console.log('✅ Categorias de receita carregadas:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Erro ao buscar categorias de receita:', error);
      
      if (this.isHttpErrorResponse(error)) {
        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description || 
                            apiError?.message || 
                            'Erro ao buscar categorias';
        
        throw new Error(errorMessage);
      }
      
      throw new Error('Erro ao buscar categorias');
    }
  }

  async createCategory(categoryName: string): Promise<IncomeCategory> {
    try {
      console.log('🔨 Criando nova categoria:', categoryName);
      const categoryData: IncomeCategoryCreate = { name: categoryName.trim() };
      
      const response$ = this.http.post<IncomeCategory>(this.apiUrl, categoryData);
      const result = await firstValueFrom(response$);
      
      console.log('✅ Categoria criada com sucesso:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Erro ao criar categoria:', error);
      
      if (this.isHttpErrorResponse(error)) {
        const apiError = error.error as ApiError;
        
        if (apiError?.error === 'INCOME_CATEGORY_ALREADY_EXISTS') {
          // Se a categoria já existe, busca ela e retorna
          console.log('ℹ️ Categoria já existe, buscando...');
          const categories = await this.getAllCategories();
          const existingCategory = categories.find(cat => 
            cat.name.toLowerCase() === categoryName.toLowerCase()
          );
          
          if (existingCategory) {
            return existingCategory;
          }
        }
        
        const errorMessage = apiError?.description || 
                            apiError?.message || 
                            'Erro ao criar categoria';
        
        throw new Error(errorMessage);
      }
      
      throw new Error('Erro ao criar categoria');
    }
  }

  async findOrCreateCategory(categoryName: string): Promise<IncomeCategory> {
    try {
      // Primeiro, tenta buscar todas as categorias para ver se já existe
      const categories = await this.getAllCategories();
      const existingCategory = categories.find(cat => 
        cat.name.toLowerCase().trim() === categoryName.toLowerCase().trim()
      );
      
      if (existingCategory) {
        console.log('✅ Categoria encontrada:', existingCategory);
        return existingCategory;
      }
      
      // Se não existe, cria uma nova
      console.log('🆕 Categoria não existe, criando nova...');
      return await this.createCategory(categoryName);
      
    } catch (error) {
      console.error('❌ Erro em findOrCreateCategory:', error);
      throw error;
    }
  }

  private isHttpErrorResponse(error: unknown): error is HttpErrorResponse {
    return error instanceof HttpErrorResponse;
  }
}