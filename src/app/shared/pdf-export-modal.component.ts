import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfExportService, PDFExportOptions } from './pdf-export';

@Component({
  selector: 'app-pdf-export-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pdf-export-modal.component.html',
  styleUrls: ['./pdf-export-modal.component.css']
})
export class PdfExportModalComponent {
  @Output() closeModal = new EventEmitter<void>();

  private pdfService = inject(PdfExportService);

  isOpen = false;
  isGenerating = false;

  selectedPeriod: 'month' | 'quarter' | 'year' | 'custom' = 'month';
  customStartDate = '';
  customEndDate = '';
  today = new Date().toISOString().split('T')[0];

  options: PDFExportOptions = {
    startDate: '',
    endDate: '',
    includeSummary: true,
    includeCharts: true,
    includeTransactions: true,
    includePiggyBanks: true,
    includeCategories: true
  };

  open() {
    this.isOpen = true;
    this.setDefaultDates();
  }

  close() {
    this.isOpen = false;
    this.closeModal.emit();
  }

  onPeriodChange() {
    this.setDefaultDates();
  }

  private setDefaultDates() {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date();

    switch (this.selectedPeriod) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date();
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        if (!this.customStartDate) {
          startDate = new Date();
          startDate.setMonth(now.getMonth() - 1);
          this.customStartDate = startDate.toISOString().split('T')[0];
        }
        if (!this.customEndDate) {
          this.customEndDate = endDate.toISOString().split('T')[0];
        }
        return;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    this.options.startDate = startDate.toISOString().split('T')[0];
    this.options.endDate = endDate.toISOString().split('T')[0];
  }

  canExport(): boolean {
    if (this.selectedPeriod === 'custom') {
      if (!this.customStartDate || !this.customEndDate) {
        return false;
      }
      this.options.startDate = this.customStartDate;
      this.options.endDate = this.customEndDate;
    }

    return this.options.includeSummary ||
      this.options.includeCharts ||
      this.options.includeTransactions ||
      this.options.includePiggyBanks ||
      this.options.includeCategories;
  }

  async exportPDF() {
    if (!this.canExport() || this.isGenerating) {
      return;
    }

    this.isGenerating = true;

    try {
      await this.pdfService.generatePDF(this.options);
      this.close();
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar o relatório. Por favor, tente novamente.');
    } finally {
      this.isGenerating = false;
    }
  }
}
