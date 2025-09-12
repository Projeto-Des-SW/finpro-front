import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PiggyBank, PiggyBankResponse, PiggyBankDeposit, PiggyBankDepositResponse, PiggyBankProgress, PiggyBankSummary } from '../entity/piggy-bank';
import { environment } from '../../../environments/environment.prod';

interface ApiError {
  error?: string;
  description?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PiggyBankService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/piggy-bank';

  async createPiggyBank(piggyBank: PiggyBank): Promise<PiggyBankResponse> {
    try {
      const response$ = this.http.post<PiggyBankResponse>(this.apiUrl, piggyBank);
      const result = await firstValueFrom(response$);

      console.log('Cofrinho criado com sucesso');
      return result;

    } catch (error) {
      console.error('Erro ao criar cofrinho:', error);

      if (this.isHttpErrorResponse(error)) {
        const apiError = error.error as ApiError;

        if (apiError?.error === 'PIGGY_BANK_ALREADY_EXISTS') {
          throw new Error('Já existe um cofrinho com este nome');
        }

        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao criar cofrinho';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao criar cofrinho');
    }
  }

  async getAllPiggyBanks(): Promise<PiggyBankResponse[]> {
    try {
      const response$ = this.http.get<PiggyBankResponse[]>(this.apiUrl);
      return await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao buscar cofrinhos:', error);

      if (this.isHttpErrorResponse(error)) {
        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao buscar cofrinhos';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao buscar cofrinhos');
    }
  }

  async getPiggyBankById(id: number): Promise<PiggyBankResponse> {
    try {
      const response$ = this.http.get<PiggyBankResponse>(`${this.apiUrl}/${id}`);
      return await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao buscar cofrinho:', error);

      if (this.isHttpErrorResponse(error)) {
        if (error.status === 404) {
          throw new Error('Cofrinho não encontrado');
        }

        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao buscar cofrinho';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao buscar cofrinho');
    }
  }

  async updatePiggyBank(id: number, piggyBank: PiggyBank): Promise<PiggyBankResponse> {
    try {
      const response$ = this.http.put<PiggyBankResponse>(`${this.apiUrl}/${id}`, piggyBank);
      return await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao atualizar cofrinho:', error);

      if (this.isHttpErrorResponse(error)) {
        if (error.status === 404) {
          throw new Error('Cofrinho não encontrado');
        }
        if (error.status === 403) {
          throw new Error('Você não tem permissão para editar este cofrinho');
        }

        const apiError = error.error as ApiError;

        if (apiError?.error === 'PIGGY_BANK_ALREADY_EXISTS') {
          throw new Error('Já existe um cofrinho com este nome');
        }

        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao atualizar cofrinho';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao atualizar cofrinho');
    }
  }

  async deletePiggyBank(id: number): Promise<void> {
    try {
      const response$ = this.http.delete<void>(`${this.apiUrl}/${id}`);
      await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao deletar cofrinho:', error);

      if (this.isHttpErrorResponse(error)) {
        if (error.status === 404) {
          throw new Error('Cofrinho não encontrado');
        }
        if (error.status === 403) {
          throw new Error('Você não tem permissão para deletar este cofrinho');
        }

        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao deletar cofrinho';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao deletar cofrinho');
    }
  }

  async searchPiggyBanksByName(name: string): Promise<PiggyBankResponse[]> {
    try {
      const response$ = this.http.get<PiggyBankResponse[]>(`${this.apiUrl}/search`, {
        params: { name }
      });
      return await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao buscar cofrinhos por nome:', error);

      if (this.isHttpErrorResponse(error)) {
        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao buscar cofrinhos';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao buscar cofrinhos');
    }
  }

  async makeDeposit(id: number, amount: number): Promise<PiggyBankDepositResponse> {
    try {
      const depositData: PiggyBankDeposit = { amount };
      const response$ = this.http.post<PiggyBankDepositResponse>(`${this.apiUrl}/${id}/deposit`, depositData);
      return await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao fazer depósito:', error);

      if (this.isHttpErrorResponse(error)) {
        if (error.status === 404) {
          throw new Error('Cofrinho não encontrado');
        }

        const apiError = error.error as ApiError;

        if (apiError?.error === 'INVALID_AMOUNT') {
          throw new Error('Valor inválido para depósito');
        }

        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao fazer depósito';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao fazer depósito');
    }
  }

  async getPiggyBankProgress(id: number): Promise<PiggyBankProgress> {
    try {
      const response$ = this.http.get<PiggyBankProgress>(`${this.apiUrl}/${id}/progress`);
      return await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao buscar progresso do cofrinho:', error);

      if (this.isHttpErrorResponse(error)) {
        if (error.status === 404) {
          throw new Error('Cofrinho não encontrado');
        }

        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao buscar progresso';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao buscar progresso');
    }
  }

  async getRemainingTime(id: number): Promise<number> {
    try {
      const response$ = this.http.get<number>(`${this.apiUrl}/${id}/remaining-time`);
      return await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao buscar tempo restante:', error);

      if (this.isHttpErrorResponse(error)) {
        if (error.status === 404) {
          throw new Error('Cofrinho não encontrado');
        }

        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao buscar tempo restante';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao buscar tempo restante');
    }
  }

  async getRecommendedDeposit(id: number): Promise<number> {
    try {
      const response$ = this.http.get<number>(`${this.apiUrl}/${id}/recommended-deposit`);
      return await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao buscar depósito recomendado:', error);

      if (this.isHttpErrorResponse(error)) {
        if (error.status === 404) {
          throw new Error('Cofrinho não encontrado');
        }

        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao buscar depósito recomendado';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao buscar depósito recomendado');
    }
  }

  async getDepositReminders(): Promise<PiggyBankResponse[]> {
    try {
      const response$ = this.http.get<PiggyBankResponse[]>(`${this.apiUrl}/reminders`);
      return await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao buscar lembretes de depósito:', error);

      if (this.isHttpErrorResponse(error)) {
        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao buscar lembretes';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao buscar lembretes');
    }
  }

  async getPiggyBankSummary(): Promise<PiggyBankSummary> {
    try {
      const response$ = this.http.get<PiggyBankSummary>(`${this.apiUrl}/summary`);
      return await firstValueFrom(response$);

    } catch (error) {
      console.error('Erro ao buscar resumo dos cofrinhos:', error);

      if (this.isHttpErrorResponse(error)) {
        const apiError = error.error as ApiError;
        const errorMessage = apiError?.description ||
          apiError?.message ||
          'Erro ao buscar resumo';

        throw new Error(errorMessage);
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Erro ao buscar resumo');
    }
  }

  private isHttpErrorResponse(error: unknown): error is HttpErrorResponse {
    return error instanceof HttpErrorResponse;
  }
}