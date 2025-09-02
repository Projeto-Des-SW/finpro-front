import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EducationalContent, EducationalContentResponse } from '../entity/educational-content';
import { environment } from '../../../environments/environment';

interface ApiError {
  error?: string;
  description?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EducationalContentService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/educational-content';

  async createContent(content: EducationalContent): Promise<EducationalContentResponse> {
    try {
      const response$ = this.http.post<EducationalContentResponse>(this.apiUrl, content);
      const result = await firstValueFrom(response$);

      console.log('Conteúdo educacional criado com sucesso');
      return result;

    } catch (error) {
      console.error('Erro ao criar conteúdo educacional:', error);

      if (this.isHttpErrorResponse(error)) {
        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao criar conteúdo educacional';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao criar conteúdo educacional');
    }
  }

  async getAllContent(category?: string): Promise<EducationalContentResponse[]> {
    try {
      let url = this.apiUrl;
      if (category) {
        url += `?category=${encodeURIComponent(category)}`;
      }

      const response$ = this.http.get<EducationalContentResponse[]>(url);
      return await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao buscar conteúdo educacional:', error);

      if (this.isHttpErrorResponse(error)) {
        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao buscar conteúdo educacional';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao buscar conteúdo educacional');
    }
  }

  async getContentById(id: number): Promise<EducationalContentResponse> {
    try {
      const response$ = this.http.get<EducationalContentResponse>(`${this.apiUrl}/${id}`);
      return await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao buscar conteúdo educacional:', error);

      if (this.isHttpErrorResponse(error)) {
        if (error.status === 404) {
          throw new Error('Conteúdo educacional não encontrado');
        }

        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao buscar conteúdo educacional';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao buscar conteúdo educacional');
    }
  }

  async updateContent(id: number, content: EducationalContent): Promise<EducationalContentResponse> {
    try {
      const response$ = this.http.put<EducationalContentResponse>(`${this.apiUrl}/${id}`, content);
      return await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao atualizar conteúdo educacional:', error);

      if (this.isHttpErrorResponse(error)) {
        if (error.status === 404) {
          throw new Error('Conteúdo educacional não encontrado');
        }
        if (error.status === 403) {
          throw new Error('Você não tem permissão para editar este conteúdo');
        }

        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao atualizar conteúdo educacional';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao atualizar conteúdo educacional');
    }
  }

  async deleteContent(id: number): Promise<void> {
    try {
      const response$ = this.http.delete<void>(`${this.apiUrl}/${id}`);
      await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao deletar conteúdo educacional:', error);

      if (this.isHttpErrorResponse(error)) {
        if (error.status === 404) {
          throw new Error('Conteúdo educacional não encontrado');
        }
        if (error.status === 403) {
          throw new Error('Você não tem permissão para deletar este conteúdo');
        }

        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao deletar conteúdo educacional';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao deletar conteúdo educacional');
    }
  }

  getUniqueCategories(contents: EducationalContentResponse[]): string[] {
    const categories = contents.map(content => content.category);
    return [...new Set(categories)].filter(Boolean).sort();
  }

  private isHttpErrorResponse(error: unknown): error is HttpErrorResponse {
    return error instanceof HttpErrorResponse;
  }
}