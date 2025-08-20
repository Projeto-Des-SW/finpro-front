import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { PiggyBankService } from './piggy-bank.service';
import { PiggyBank, PiggyBankResponse } from '../entity/piggy-bank';

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

  // Filtros
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
      this.applyFilters();
    } catch (error: any) {
      console.error('Erro ao carregar cofrinhos:', error);
      this.errorMessage = error.message || 'Erro ao carregar cofrinhos';
    }
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.resetForm();
    }
  }

  async onSubmit() {
    if (this.piggyBankForm.valid) {
      this.loading = true;
      this.errorMessage = '';

      try {
        const formData = this.piggyBankForm.value;
        
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
          // Atualizar cofrinho existente
          await this.piggyBankService.updatePiggyBank(this.editingPiggyBankId, piggyBankData);
          console.log('Cofrinho atualizado com sucesso');
        } else {
          // Criar novo cofrinho
          await this.piggyBankService.createPiggyBank(piggyBankData);
          console.log('Cofrinho criado com sucesso');
        }

        // Recarregar dados
        await this.loadPiggyBanks();

        // Reset do formulário
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

  resetForm() {
    this.piggyBankForm.reset({
      currentAmount: 0
    });
    this.errorMessage = '';
    
    // Reset do estado de edição
    this.isEditing = false;
    this.editingPiggyBankId = null;
  }

  editPiggyBank(piggyBank: PiggyBankResponse) {
    // Configurar modo de edição
    this.isEditing = true;
    this.editingPiggyBankId = piggyBank.piggyBankId;

    // Preencher formulário
    this.piggyBankForm.patchValue({
      name: piggyBank.name,
      savingsGoal: piggyBank.savingsGoal,
      monthlyDeposit: piggyBank.monthlyDeposit,
      targetDate: piggyBank.targetDate.split('T')[0], // Remove time se existir
      currentAmount: piggyBank.currentAmount,
      depositDay: piggyBank.depositDay || ''
    });

    // Mostrar formulário
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

  // =================== FILTROS ===================

  applyFilters() {
    let filtered = [...this.piggyBanks];

    // Filtro por status
    if (this.filters.status) {
      filtered = filtered.filter(piggyBank => 
        piggyBank.status === this.filters.status
      );
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

  // =================== MODAIS ===================

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

  // =================== MODAL DE DEPÓSITO ===================

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
      
      // Mostrar mensagem de sucesso
      alert(result.message || 'Depósito realizado com sucesso!');

      // Recarregar dados
      await this.loadPiggyBanks();

      // Fechar modal
      this.closeDepositModal();

    } catch (error: any) {
      console.error('Erro ao fazer depósito:', error);
      this.depositError = error.message || 'Erro ao fazer depósito';
    } finally {
      this.loading = false;
    }
  }

  // =================== HELPERS ===================

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ON_TRACK': return 'No prazo';
      case 'BEHIND': return 'Atrasado';
      case 'COMPLETED': return 'Concluído';
      default: return status;
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