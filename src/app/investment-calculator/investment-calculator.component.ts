import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import {
  InvestmentService,
  InvestmentSimulationDTO,
  InvestmentSimulationResponseDTO,
  InvestmentType
} from './investment.service';

interface SimulationResult {
  valorFinal: number;
  totalInvestido: number;
  rendimentoTotal: number;
  taxaEfetivaAnual: number;
  taxaEfetivaMensal: number;
}

@Component({
  selector: 'app-investment-calculator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './investment-calculator.component.html',
  styleUrls: ['./investment-calculator.component.css']
})
export class InvestmentCalculatorComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private investmentService = inject(InvestmentService);

  calculatorForm: FormGroup;
  simulationResult: SimulationResult | null = null;
  
  calculating = false;
  errorMessage = '';
  
  // Opções para o formulário
  investmentTypes = this.investmentService.getInvestmentTypes();
  periodOptions = [
    { value: 6, label: '6 meses' },
    { value: 12, label: '1 ano' },
    { value: 24, label: '2 anos' },
    { value: 36, label: '3 anos' },
    { value: 60, label: '5 anos' },
    { value: 120, label: '10 anos' }
  ];

  constructor() {
    this.calculatorForm = this.fb.group({
      startValue: [10000, [Validators.required, Validators.min(100)]],
      monthlyValue: [500, [Validators.required, Validators.min(0)]],
      months: [12, [Validators.required, Validators.min(1), Validators.max(600)]],
      investmentType: [InvestmentType.SELIC, [Validators.required]],
      percentInvestmentType: [100, [Validators.required, Validators.min(1), Validators.max(200)]]
    });
  }

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
  }

  async onCalculate() {
    if (this.calculatorForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.calculating = true;
    this.errorMessage = '';
    this.simulationResult = null;

    try {
      const formData = this.calculatorForm.value;
      
      const simulationData: InvestmentSimulationDTO = {
        startValue: Number(formData.startValue),
        monthlyValue: Number(formData.monthlyValue),
        months: Number(formData.months),
        investmentType: formData.investmentType,
        percentInvestmentType: Number(formData.percentInvestmentType)
      };

      console.log('Calculando simulação:', simulationData);
      
      const result = await this.investmentService.simulate(simulationData);
      this.simulationResult = result;
      
      console.log('Resultado calculado:', result);

    } catch (error: any) {
      console.error('Erro no cálculo:', error);
      this.errorMessage = error.message || 'Erro ao calcular simulação';
    } finally {
      this.calculating = false;
    }
  }

  onClear() {
    this.calculatorForm.reset({
      startValue: 10000,
      monthlyValue: 500,
      months: 12,
      investmentType: InvestmentType.SELIC,
      percentInvestmentType: 100
    });
    
    this.simulationResult = null;
    this.errorMessage = '';
  }

  private markFormGroupTouched() {
    Object.keys(this.calculatorForm.controls).forEach(key => {
      const control = this.calculatorForm.get(key);
      control?.markAsTouched();
    });
  }

  // =================== MÉTODOS DE FORMATAÇÃO ===================

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  getFieldError(fieldName: string): string {
    const control = this.calculatorForm.get(fieldName);
    
    if (control?.errors && control?.touched) {
      if (control.errors['required']) {
        return 'Campo obrigatório';
      }
      if (control.errors['min']) {
        return `Valor mínimo: ${control.errors['min'].min}`;
      }
      if (control.errors['max']) {
        return `Valor máximo: ${control.errors['max'].max}`;
      }
    }
    
    return '';
  }

  hasFieldError(fieldName: string): boolean {
    const control = this.calculatorForm.get(fieldName);
    return !!(control?.errors && control?.touched);
  }

  // =================== GETTERS PARA TEMPLATE ===================

  get totalTimeDescription(): string {
    const months = this.calculatorForm.get('months')?.value || 0;
    
    if (months < 12) {
      return `${months} mes${months !== 1 ? 'es' : ''}`;
    }
    
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    let description = `${years} ano${years !== 1 ? 's' : ''}`;
    
    if (remainingMonths > 0) {
      description += ` e ${remainingMonths} mes${remainingMonths !== 1 ? 'es' : ''}`;
    }
    
    return description;
  }

  get selectedInvestmentLabel(): string {
    const selected = this.investmentTypes.find(
      type => type.value === this.calculatorForm.get('investmentType')?.value
    );
    return selected?.label || 'Tipo não selecionado';
  }

  // =================== MÉTODOS DE RESULTADO ===================

  getResultStatus(type: 'profit' | 'loss' | 'neutral'): string {
    if (!this.simulationResult) return 'neutral';
    
    const profit = this.simulationResult.rendimentoTotal;
    
    if (type === 'profit') return profit > 0 ? 'positive' : 'neutral';
    if (type === 'loss') return profit < 0 ? 'negative' : 'neutral';
    
    return profit === 0 ? 'neutral' : profit > 0 ? 'positive' : 'negative';
  }

  getReturnRate(): number {
    if (!this.simulationResult) return 0;
    
    const totalInvested = this.simulationResult.totalInvestido;
    const totalReturn = this.simulationResult.rendimentoTotal;
    
    return totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
  }
}