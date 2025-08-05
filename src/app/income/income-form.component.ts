import { Component, inject, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IncomeService } from './income.service';
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

  incomeForm: FormGroup = this.fb.group({
    date: ['', Validators.required],
    amount: ['', [Validators.required, Validators.min(0.01)]],
    paymentOrigin: ['', Validators.required],
    balanceSource: ['', Validators.required],
    observation: [''],
    incomeCategoryId: [1, Validators.required] // Adicionado campo de categoria com valor padrão 1
  });

  loading = false;
  errorMessage = '';

  ngOnInit() {
    if (this.editMode && this.incomeToEdit) {
      this.loadIncomeData();
    } else {
      // Define data atual como padrão
      const today = new Date().toISOString().split('T')[0];
      this.incomeForm.patchValue({ date: today });
    }
  }

  private loadIncomeData() {
    if (this.incomeToEdit) {
      this.incomeForm.patchValue({
        date: this.incomeToEdit.date,
        amount: this.incomeToEdit.amount,
        paymentOrigin: this.incomeToEdit.paymentOrigin,
        balanceSource: this.incomeToEdit.balanceSource,
        observation: this.incomeToEdit.observation || '',
        incomeCategoryId: this.incomeToEdit.incomeCategoryId || 1
      });
    }
  }

  async onSubmit() {
    if (this.incomeForm.valid) {
      this.loading = true;
      this.errorMessage = '';

      try {
        const formData = this.incomeForm.value;
        const incomeData: Income = {
          date: formData.date,
          amount: Number(formData.amount),
          paymentOrigin: formData.paymentOrigin,
          balanceSource: formData.balanceSource,
          observation: formData.observation || undefined,
          incomeCategoryId: Number(formData.incomeCategoryId) // Adicionado campo de categoria
        };

        if (this.editMode && this.incomeToEdit) {
          await this.incomeService.updateIncome(this.incomeToEdit.incomeId!, incomeData);
        } else {
          await this.incomeService.createIncome(incomeData);
        }

        this.formSubmit.emit();
        this.resetForm();

      } catch (error: any) {
        this.errorMessage = error.message;
      } finally {
        this.loading = false;
      }
    } else {
      this.incomeForm.markAllAsTouched();
    }
  }

  onCancel() {
    this.formCancel.emit();
    this.resetForm();
  }

  private resetForm() {
    this.incomeForm.reset();
    this.errorMessage = '';
    const today = new Date().toISOString().split('T')[0];
    this.incomeForm.patchValue({ 
      date: today,
      incomeCategoryId: 1 // Valor padrão para categoria
    });
  }
}