import { Component, inject, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IncomeService } from './income.service';
import { IncomeCategoryService, IncomeCategory } from './income-category.service';
import { Income } from '../entity/income';

@Component({
  selector: 'app-income-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './income-form.component.html',
  styleUrls: ['./income-form.component.css']
})
export class IncomeFormComponent implements OnInit {
  @Input() incomeToEdit?: Income;
  @Input() editMode = false;
  @Output() formSubmit = new EventEmitter<void>();
  @Output() formCancel = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private incomeService = inject(IncomeService);
  private incomeCategoryService = inject(IncomeCategoryService);

  incomeForm: FormGroup = this.fb.group({
    date: ['', Validators.required],
    amount: ['', [Validators.required, Validators.min(0.01)]],
    paymentOrigin: ['', Validators.required],
    balanceSource: ['', Validators.required],
    observation: [''],
    categoryInput: ['', Validators.required], 
    selectedCategoryId: [null] 
  });

  loading = false;
  errorMessage = '';
  incomeCategories: IncomeCategory[] = [];
  filteredCategories: IncomeCategory[] = [];
  showSuggestions = false;
  isCreatingCategory = false;

  ngOnInit() {
    this.loadIncomeCategories();
    
    if (this.editMode && this.incomeToEdit) {
      this.loadIncomeData();
    } else {
      // Define data atual como padrão
      const today = new Date().toISOString().split('T')[0];
      this.incomeForm.patchValue({ date: today });
    }

    // Configurar listener para o campo de categoria
    this.setupCategoryInputListener();
  }

  private async loadIncomeCategories() {
    try {
      this.incomeCategories = await this.incomeCategoryService.getAllCategories();
      this.filteredCategories = [...this.incomeCategories];
      console.log('Categorias carregadas:', this.incomeCategories);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      this.errorMessage = 'Erro ao carregar categorias. Você ainda pode criar uma nova.';
    }
  }

  private setupCategoryInputListener() {
    const categoryControl = this.incomeForm.get('categoryInput');
    
    categoryControl?.valueChanges.subscribe(value => {
      if (typeof value === 'string') {
        this.filterCategories(value);
        
        // Resetar categoria selecionada se o usuário está digitando
        if (this.incomeForm.get('selectedCategoryId')?.value) {
          this.incomeForm.patchValue({ selectedCategoryId: null });
        }
      }

     
    });
  }

  private filterCategories(searchTerm: string) {
    if (!searchTerm.trim()) {
      this.filteredCategories = [...this.incomeCategories];
      this.showSuggestions = false;
      return;
    }

    this.filteredCategories = this.incomeCategories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    this.showSuggestions = true;
  }

  selectCategory(category: IncomeCategory) {
    this.incomeForm.patchValue({
      categoryInput: category.name,
      selectedCategoryId: category.incomeCategoryId
    });
    this.showSuggestions = false;
  }

  onCategoryInputFocus() {
    if (this.filteredCategories.length > 0) {
      this.showSuggestions = true;
    }
  }

  onCategoryInputBlur() {
    // Delay para permitir clique nas sugestões
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  private loadIncomeData() {
    if (this.incomeToEdit) {
      // Buscar o nome da categoria pelo ID
      const category = this.incomeCategories.find(cat => 
        cat.incomeCategoryId === this.incomeToEdit!.incomeCategoryId
      );

      this.incomeForm.patchValue({
        date: this.incomeToEdit.date,
        amount: this.incomeToEdit.amount,
        paymentOrigin: this.incomeToEdit.paymentOrigin,
        balanceSource: this.incomeToEdit.balanceSource,
        observation: this.incomeToEdit.observation || '',
        categoryInput: category?.name || '',
        selectedCategoryId: this.incomeToEdit.incomeCategoryId
      });
    }
  }

  async onSubmit() {
    if (this.incomeForm.valid) {
      this.loading = true;
      this.errorMessage = '';

      try {
        const formData = this.incomeForm.value;
        let categoryId = formData.selectedCategoryId;

        // Se não há categoria selecionada, significa que o usuário digitou uma nova
        if (!categoryId && formData.categoryInput?.trim()) {
          this.isCreatingCategory = true;
          console.log('🆕 Criando nova categoria:', formData.categoryInput);
          
          const newCategory = await this.incomeCategoryService.findOrCreateCategory(
            formData.categoryInput.trim()
          );
          
          categoryId = newCategory.incomeCategoryId;
          
          // Atualizar lista de categorias
          await this.loadIncomeCategories();
          
          console.log('✅ Categoria obtida/criada com ID:', categoryId);
          this.isCreatingCategory = false;
        }

        if (!categoryId) {
          throw new Error('Categoria é obrigatória');
        }

        const incomeData: Income = {
          date: formData.date,
          amount: Number(formData.amount),
          paymentOrigin: formData.paymentOrigin.trim(),
          balanceSource: formData.balanceSource.trim(),
          observation: formData.observation?.trim() || undefined,
          incomeCategoryId: categoryId
        };

        console.log('Dados da receita sendo enviados:', incomeData);

        if (this.editMode && this.incomeToEdit) {
          await this.incomeService.updateIncome(this.incomeToEdit.incomeId!, incomeData);
          console.log('Receita atualizada com sucesso');
        } else {
          await this.incomeService.createIncome(incomeData);
          console.log('Receita criada com sucesso');
        }

        this.formSubmit.emit();
        this.resetForm();

      } catch (error: any) {
        console.error('Erro ao salvar receita:', error);
        this.errorMessage = error.message || 'Erro ao salvar receita';
        this.isCreatingCategory = false;
      } finally {
        this.loading = false;
      }
    } else {
      this.incomeForm.markAllAsTouched();
      this.errorMessage = 'Por favor, preencha todos os campos obrigatórios';
    }
  }

  onCancel() {
    this.formCancel.emit();
    this.resetForm();
  }

  private resetForm() {
    this.incomeForm.reset();
    this.errorMessage = '';
    this.showSuggestions = false;
    this.isCreatingCategory = false;
    
    const today = new Date().toISOString().split('T')[0];
    this.incomeForm.patchValue({ date: today });
  }

  get categoryStatus(): string {
    const categoryInput = this.incomeForm.get('categoryInput')?.value;
    const selectedCategoryId = this.incomeForm.get('selectedCategoryId')?.value;

    if (!categoryInput?.trim()) {
      return '';
    }

    if (selectedCategoryId) {
      return 'Categoria existente selecionada';
    }

    if (this.isCreatingCategory) {
      return 'Criando nova categoria...';
    }

    const existingCategory = this.incomeCategories.find(cat =>
      cat.name.toLowerCase() === categoryInput.toLowerCase().trim()
    );

    if (existingCategory) {
      return 'Categoria encontrada';
    }

    return 'Nova categoria será criada';
  }
}