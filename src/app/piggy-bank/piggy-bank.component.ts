// src/app/piggy-bank/piggy-bank.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { PiggyBankService } from './piggy-bank.service';
import { PiggyBank, PiggyBankResponse, PiggyBankStatusCalculated } from '../entity/piggy-bank';

interface FilterOptions {
  status: string;
  searchTerm: string;
}

@Component({
  selector: 'app-piggy-bank',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './piggy-bank.component.html',
  styleUrls: ['./piggy-bank.component.css']
})
export class PiggyBankComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private piggyBankService = inject(PiggyBankService);

  piggyBanks: PiggyBankResponse[] = [];
  filteredPiggyBanks: PiggyBankResponse[] = [];

  showForm = false;
  loading = false;
  errorMessage = '';

  // Estado de edição
  isEditing = false;
  editingPiggyBankId: number | null = null;

  // Modais
  showPiggyBankModal = false;
  selectedPiggyBank: PiggyBankResponse | null = null;
  
  showDepositModal = false;
  selectedPiggyBankForDeposit: PiggyBankResponse | null = null;
  depositAmount: number = 0;
  depositError = '';

  // Filtros - Adicionando OVERDUE
  filters: FilterOptions = {
    status: '',
    searchTerm: ''
  };

  // Dias do mês para depósito
  depositDays = Array.from({ length: 31 }, (_, i) => i + 1);

  // Formulário
  piggyBankForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    savingsGoal: ['', [Validators.required, Validators.min(0.01)]],
    monthlyDeposit: ['', [Validators.required, Validators.min(0.01)]],
    targetDate: ['', [Validators.required]],
    currentAmount: [0],
    depositDay: ['']
  });

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadPiggyBanks();
  }

  async loadPiggyBanks() {
    try {
      this.piggyBanks = await this.piggyBankService.getAllPiggyBanks();
      
      // Processar status calculado para cada cofrinho
      this.piggyBanks = this.piggyBanks.map(piggyBank => ({
        ...piggyBank,
        calculatedStatus: this.calculateCurrentStatus(piggyBank)
      }));
      
      this.applyFilters();
    } catch (error: any) {
      console.error('Erro ao carregar cofrinhos:', error);
      this.errorMessage = error.message || 'Erro ao carregar cofrinhos';
    }
  }

  // =================== CÁLCULO DE STATUS ===================

  calculateCurrentStatus(piggyBank: PiggyBankResponse): PiggyBankStatusCalculated {
    const today = new Date();
    const targetDate = new Date(piggyBank.targetDate);

    // Se já atingiu a meta
    if (piggyBank.currentAmount >= piggyBank.savingsGoal) {
      return 'COMPLETED';
    }

    // Se a data já passou e não atingiu a meta
    if (targetDate < today) {
      return 'OVERDUE';
    }

    // Calcular se está no prazo baseado no progresso esperado
    const totalDaysFromStart = this.calculateDaysFromStart(piggyBank);
    const daysPassed = this.calculateDaysPassed(piggyBank);
    
    if (totalDaysFromStart > 0) {
      const expectedProgress = daysPassed / totalDaysFromStart;
      const actualProgress = piggyBank.currentAmount / piggyBank.savingsGoal;
      
      // Se o progresso real está 20% abaixo do esperado
      if (actualProgress < (expectedProgress * 0.8)) {
        return 'BEHIND';
      }
    }

    return 'ON_TRACK';
  }

  private calculateDaysFromStart(piggyBank: PiggyBankResponse): number {
    // Assumindo que o cofrinho foi criado há 30 dias se não tiver data de criação
    // Você pode ajustar isso se tiver a data de criação no backend
    const createdDate = piggyBank.lastDepositDate ? 
      new Date(piggyBank.lastDepositDate) : 
      new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    
    const targetDate = new Date(piggyBank.targetDate);
    const diffTime = Math.abs(targetDate.getTime() - createdDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateDaysPassed(piggyBank: PiggyBankResponse): number {
    const createdDate = piggyBank.lastDepositDate ? 
      new Date(piggyBank.lastDepositDate) : 
      new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - createdDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // =================== HELPERS ATUALIZADOS ===================

  getCalculatedStatus(piggyBank: PiggyBankResponse): PiggyBankStatusCalculated {
    return this.calculateCurrentStatus(piggyBank);
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ON_TRACK': return 'No prazo';
      case 'BEHIND': return 'Atrasado';
      case 'COMPLETED': return 'Concluído';
      case 'OVERDUE': return 'Vencido';
      default: return status;
    }
  }

  isOverdue(piggyBank: PiggyBankResponse): boolean {
    return this.getCalculatedStatus(piggyBank) === 'OVERDUE';
  }

  canDeposit(piggyBank: PiggyBankResponse): boolean {
    const status = this.getCalculatedStatus(piggyBank);
    return status !== 'COMPLETED';
  }

  canExtendDeadline(piggyBank: PiggyBankResponse): boolean {
    return this.isOverdue(piggyBank);
  }

  getDaysOverdue(piggyBank: PiggyBankResponse): number {
    if (!this.isOverdue(piggyBank)) return 0;
    
    const today = new Date();
    const targetDate = new Date(piggyBank.targetDate);
    const diffTime = today.getTime() - targetDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // =================== FILTROS ATUALIZADOS ===================

  applyFilters() {
    let filtered = [...this.piggyBanks];

    // Filtro por status (incluindo OVERDUE)
    if (this.filters.status) {
      filtered = filtered.filter(piggyBank => {
        const calculatedStatus = this.getCalculatedStatus(piggyBank);
        return calculatedStatus === this.filters.status;
      });
    }

    // Filtro por busca
    if (this.filters.searchTerm) {
      const searchTerm = this.filters.searchTerm.toLowerCase();
      filtered = filtered.filter(piggyBank =>
        piggyBank.name.toLowerCase().includes(searchTerm)
      );
    }

    this.filteredPiggyBanks = filtered;
  }

  // =================== VALIDAÇÃO DE FORMULÁRIO ATUALIZADA ===================

  async onSubmit() {
    if (this.piggyBankForm.valid) {
      this.loading = true;
      this.errorMessage = '';

      try {
        const formData = this.piggyBankForm.value;
        const targetDate = new Date(formData.targetDate);
        const today = new Date();

        // Validação especial para edição de cofrinhos vencidos
        if (this.isEditing && this.editingPiggyBankId) {
          const existingPiggyBank = this.piggyBanks.find(pb => 
            pb.piggyBankId === this.editingPiggyBankId
          );
          
          if (existingPiggyBank && this.isOverdue(existingPiggyBank)) {
            // Se está vencido, permitir apenas estender o prazo
            const currentTargetDate = new Date(existingPiggyBank.targetDate);
            if (targetDate <= currentTargetDate) {
              this.errorMessage = 'Para cofrinhos vencidos, você só pode estender o prazo.';
              this.loading = false;
              return;
            }
          }
        } else {
          // Para novos cofrinhos, não permitir data no passado
          if (targetDate < today) {
            this.errorMessage = 'A data meta não pode ser no passado.';
            this.loading = false;
            return;
          }
        }
        
        const piggyBankData: PiggyBank = {
          name: formData.name.trim(),
          savingsGoal: Number(formData.savingsGoal),
          monthlyDeposit: Number(formData.monthlyDeposit),
          targetDate: formData.targetDate,
          currentAmount: Number(formData.currentAmount) || 0,
          status: 'ON_TRACK',
          depositDay: formData.depositDay || undefined
        };

        if (this.isEditing && this.editingPiggyBankId) {
          await this.piggyBankService.updatePiggyBank(this.editingPiggyBankId, piggyBankData);
          console.log('Cofrinho atualizado com sucesso');
        } else {
          await this.piggyBankService.createPiggyBank(piggyBankData);
          console.log('Cofrinho criado com sucesso');
        }

        await this.loadPiggyBanks();
        this.resetForm();
        this.showForm = false;

      } catch (error: any) {
        console.error('Erro ao salvar cofrinho:', error);
        this.errorMessage = error.message || 'Erro ao salvar cofrinho';
      } finally {
        this.loading = false;
      }
    } else {
      this.piggyBankForm.markAllAsTouched();
    }
  }

  // =================== MODAL DE EXTENSÃO DE PRAZO ===================

  showExtendModal = false;
  extendDate = '';

  openExtendModal(piggyBank: PiggyBankResponse) {
    this.selectedPiggyBank = piggyBank;
    this.extendDate = '';
    this.showExtendModal = true;
  }

  closeExtendModal() {
    this.showExtendModal = false;
    this.selectedPiggyBank = null;
    this.extendDate = '';
  }

  async extendDeadline() {
    if (!this.selectedPiggyBank || !this.extendDate) {
      return;
    }

    const newDate = new Date(this.extendDate);
    const currentDate = new Date(this.selectedPiggyBank.targetDate);

    if (newDate <= currentDate) {
      alert('A nova data deve ser posterior à data atual.');
      return;
    }

    try {
      this.loading = true;

      const updateData: PiggyBank = {
        name: this.selectedPiggyBank.name,
        savingsGoal: this.selectedPiggyBank.savingsGoal,
        monthlyDeposit: this.selectedPiggyBank.monthlyDeposit,
        targetDate: this.extendDate,
        currentAmount: this.selectedPiggyBank.currentAmount,
        status: 'ON_TRACK',
        depositDay: this.selectedPiggyBank.depositDay
      };

      await this.piggyBankService.updatePiggyBank(
        this.selectedPiggyBank.piggyBankId, 
        updateData
      );

      await this.loadPiggyBanks();
      this.closeExtendModal();
      alert('Prazo estendido com sucesso!');

    } catch (error: any) {
      console.error('Erro ao estender prazo:', error);
      alert(error.message || 'Erro ao estender prazo');
    } finally {
      this.loading = false;
    }
  }

  // Métodos existentes permanecem os mesmos...
  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.resetForm();
    }
  }

  resetForm() {
    this.piggyBankForm.reset({
      currentAmount: 0
    });
    this.errorMessage = '';
    
    this.isEditing = false;
    this.editingPiggyBankId = null;
  }

  editPiggyBank(piggyBank: PiggyBankResponse) {
    this.isEditing = true;
    this.editingPiggyBankId = piggyBank.piggyBankId;

    this.piggyBankForm.patchValue({
      name: piggyBank.name,
      savingsGoal: piggyBank.savingsGoal,
      monthlyDeposit: piggyBank.monthlyDeposit,
      targetDate: piggyBank.targetDate.split('T')[0],
      currentAmount: piggyBank.currentAmount,
      depositDay: piggyBank.depositDay || ''
    });

    this.showForm = true;
    this.errorMessage = '';

    setTimeout(() => {
      this.scrollToForm();
    }, 100);

    console.log('Editando cofrinho:', piggyBank);
  }

  async deletePiggyBank(piggyBankId: number) {
    if (confirm('Tem certeza que deseja excluir este cofrinho?')) {
      try {
        await this.piggyBankService.deletePiggyBank(piggyBankId);
        await this.loadPiggyBanks();
        console.log('Cofrinho excluído com sucesso');
      } catch (error: any) {
        console.error('Erro ao deletar cofrinho:', error);
        alert(error.message || 'Erro ao deletar cofrinho');
      }
    }
  }

  openPiggyBankModal(piggyBank: PiggyBankResponse) {
    this.selectedPiggyBank = piggyBank;
    this.showPiggyBankModal = true;
  }

  closePiggyBankModal() {
    this.showPiggyBankModal = false;
    this.selectedPiggyBank = null;
  }

  editPiggyBankFromModal() {
    if (this.selectedPiggyBank) {
      this.editPiggyBank(this.selectedPiggyBank);
      this.closePiggyBankModal();
    }
  }

  async deletePiggyBankFromModal() {
    if (this.selectedPiggyBank && confirm('Tem certeza que deseja excluir este cofrinho?')) {
      try {
        await this.piggyBankService.deletePiggyBank(this.selectedPiggyBank.piggyBankId);
        await this.loadPiggyBanks();
        this.closePiggyBankModal();
        console.log('Cofrinho excluído com sucesso');
      } catch (error: any) {
        console.error('Erro ao deletar cofrinho:', error);
        alert(error.message || 'Erro ao deletar cofrinho');
      }
    }
  }

  openDepositModal(piggyBank: PiggyBankResponse) {
    this.selectedPiggyBankForDeposit = piggyBank;
    this.depositAmount = 0;
    this.depositError = '';
    this.showDepositModal = true;
  }

  closeDepositModal() {
    this.showDepositModal = false;
    this.selectedPiggyBankForDeposit = null;
    this.depositAmount = 0;
    this.depositError = '';
  }

  async confirmDeposit() {
    if (!this.selectedPiggyBankForDeposit || !this.depositAmount || this.depositAmount <= 0) {
      this.depositError = 'Valor do depósito deve ser maior que zero';
      return;
    }

    this.loading = true;
    this.depositError = '';

    try {
      const result = await this.piggyBankService.makeDeposit(
        this.selectedPiggyBankForDeposit.piggyBankId, 
        this.depositAmount
      );

      console.log('Depósito realizado:', result);
      
      alert(result.message || 'Depósito realizado com sucesso!');
      await this.loadPiggyBanks();
      this.closeDepositModal();

    } catch (error: any) {
      console.error('Erro ao fazer depósito:', error);
      this.depositError = error.message || 'Erro ao fazer depósito';
    } finally {
      this.loading = false;
    }
  }

  getProgressPercentage(piggyBank: PiggyBankResponse): number {
    if (piggyBank.progressPercentage !== undefined) {
      return Math.round(piggyBank.progressPercentage);
    }
    
    if (piggyBank.savingsGoal <= 0) return 0;
    
    const percentage = (piggyBank.currentAmount / piggyBank.savingsGoal) * 100;
    return Math.min(Math.round(percentage), 100);
  }

  getRemainingAmount(piggyBank: PiggyBankResponse): number {
    const remaining = piggyBank.savingsGoal - piggyBank.currentAmount;
    return Math.max(remaining, 0);
  }

  formatCurrency(amount: number): string {
    return amount.toFixed(2).replace('.', ',');
  }

  formatDate(dateString: string): string {
    if (dateString.includes('T')) {
      return new Date(dateString).toLocaleDateString('pt-BR');
    }

    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR');
  }

  private scrollToForm() {
    const formElement = document.querySelector('.form-container');
    if (formElement) {
      const elementPosition = formElement.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - 80;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }
}