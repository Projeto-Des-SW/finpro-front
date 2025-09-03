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

export interface PiggyBankSummaryData {
  totalPiggyBanks: number;
  completedPiggyBanks: number;
  totalSaved: number;
  totalGoals: number;
  progressPercentage: number;
  onTrackCount: number;
  behindCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/dashboard';
  private piggyBankApiUrl = environment.apiUrl + '/piggy-bank';

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

  private parseNumber(value: any): number {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  private parseApiSummaryResponse(result: any): PiggyBankSummaryData {
    return {
      totalPiggyBanks: this.parseNumber(result.totalPiggyBanks ?? result.total ?? 0),
      completedPiggyBanks: this.parseNumber(result.completedPiggyBanks ?? result.concluidos ?? 0),
      totalSaved: this.parseNumber(result.totalSaved ?? result.totalEconomizado ?? 0),
      totalGoals: this.parseNumber(result.totalGoals ?? result.totalGoal ?? result.totalMetas ?? 0),
      progressPercentage: this.parseNumber(result.progressPercentage ?? result.overallProgressPercentage ?? result.progresso ?? 0),
      onTrackCount: this.parseNumber(result.onTrackCount ?? result.onTrack ?? result.noPrazo ?? 0),
      behindCount: this.parseNumber(result.behindCount ?? result.behind ?? result.atrasados ?? 0)
    };
  }
  async getPiggyBankSummary(): Promise<PiggyBankSummaryData> {
    try {
      const response$ = this.http.get<any[]>(`${this.piggyBankApiUrl}`);
      const piggyBanks = await firstValueFrom(response$);
      return this.calculatePiggyBankSummary(piggyBanks);
    } catch (error) {
      console.error('Erro ao buscar resumo de cofrinhos:', error);
      return {
        totalPiggyBanks: 0,
        completedPiggyBanks: 0,
        totalSaved: 0,
        totalGoals: 0,
        progressPercentage: 0,
        onTrackCount: 0,
        behindCount: 0
      };
    }
  }

  private calculatePiggyBankSummary(piggyBanks: any[]): PiggyBankSummaryData {
    console.log('Calculando resumo para cofrinhos:', piggyBanks);

    const totalPiggyBanks = piggyBanks.length;

    if (totalPiggyBanks === 0) {
      return {
        totalPiggyBanks: 0,
        completedPiggyBanks: 0,
        totalSaved: 0,
        totalGoals: 0,
        progressPercentage: 0,
        onTrackCount: 0,
        behindCount: 0
      };
    }

    let completedPiggyBanks = 0;
    let onTrackCount = 0;
    let behindCount = 0;

    piggyBanks.forEach(pb => {
      const status = (pb.status || '').toString().toLowerCase().trim();
      if (['completed', 'concluído', 'concluido'].includes(status)) {
        completedPiggyBanks++;
      } else if (['on_track', 'on-track', 'no_prazo', 'no prazo'].includes(status)) {
        onTrackCount++;
      } else if (['behind', 'atrasado'].includes(status)) {
        behindCount++;
      } else {
        onTrackCount++;
      }
    });

    const totalSaved = piggyBanks.reduce((sum, pb) => {
      const currentAmount = this.parseNumber(
        pb.current_amount ??
        pb.currentAmount ??
        pb.totalSaved ??
        pb.valorAtual ??
        pb.valor_atual ??
        pb.amount ??
        pb.valor ??
        0
      );
      return sum + currentAmount;
    }, 0);

    const totalGoals = piggyBanks.reduce((sum, pb) => {
      const savingsGoal = this.parseNumber(
        pb.savings_goal ??
        pb.savingsGoal ??
        pb.totalGoal ??
        pb.totalGoals ??
        pb.meta ??
        pb.objetivo ??
        pb.target ??
        pb.goal ??
        pb.valorMeta ??
        pb.valor_meta ??
        0
      );
      return sum + savingsGoal;
    }, 0);

    const progressPercentage = totalGoals > 0
      ? Math.round((totalSaved / totalGoals) * 100)
      : 0;

    return {
      totalPiggyBanks,
      completedPiggyBanks,
      totalSaved: Math.round(totalSaved * 100) / 100,
      totalGoals: Math.round(totalGoals * 100) / 100,
      progressPercentage: Math.min(progressPercentage, 100),
      onTrackCount,
      behindCount
    };
  }

}
