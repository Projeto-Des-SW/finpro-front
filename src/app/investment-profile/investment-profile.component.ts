import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { InvestmentProfileService } from './investment-profile.service';
import {
    QuestionnaireResponseDTO,
    QuestionnaireAnswer,
    ProfileCalculationResultDTO,
    InvestorProfileRequestDTO,
    InvestorProfileResponseDTO,
    RiskProfile,
    RiskTolerance,
    InvestmentTerm,
    KnowledgeLevel
} from '../entity/investment-profile';

interface Question {
    id: number;
    text: string;
    options: { value: number; text: string; }[];
    step: number;
}

@Component({
    selector: 'app-investment-profile',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './investment-profile.component.html',
    styleUrls: ['./investment-profile.component.css']
})
export class InvestmentProfileComponent implements OnInit {
    questionsForm: FormGroup;
    currentStep = 1;
    totalSteps = 3;
    loading = false;
    hasExistingProfile = false;
    existingProfile: InvestorProfileResponseDTO | null = null;
    calculationResult: ProfileCalculationResultDTO | null = null;

    questions: Question[] = [
        // Etapa 1 - Tolerância ao Risco e Objetivos
        {
            id: 1,
            text: "Qual é o seu principal objetivo com os investimentos?",
            step: 1,
            options: [
                { value: 1, text: "Preservar capital - Não quero correr riscos" },
                { value: 2, text: "Crescimento moderado - Aceito poucos riscos" },
                { value: 5, text: "Crescimento agressivo - Aceito riscos para maiores retornos" }
            ]
        },
        {
            id: 2,
            text: "Como você reagiria se seus investimentos perdessem 20% do valor em um mês?",
            step: 1,
            options: [
                { value: 1, text: "Venderia tudo imediatamente por medo de mais perdas" },
                { value: 2, text: "Ficaria preocupado, mas manteria os investimentos" },
                { value: 5, text: "Veria como oportunidade para investir mais" }
            ]
        },
        // Etapa 2 - Experiência e Conhecimento
        {
            id: 3,
            text: "Qual o seu nível de experiência com investimentos?",
            step: 2,
            options: [
                { value: 1, text: "Iniciante - Pouca ou nenhuma experiência" },
                { value: 2, text: "Intermediário - Alguma experiência e conhecimento" },
                { value: 3, text: "Avançado - Experiência significativa e conhecimento técnico" }
            ]
        },
        {
            id: 4,
            text: "Com que frequência você acompanha seus investimentos?",
            step: 2,
            options: [
                { value: 1, text: "Raramente - Prefiro investimentos que não precisam de acompanhamento" },
                { value: 2, text: "Mensalmente - Gosto de acompanhar mas sem obsessão" },
                { value: 3, text: "Diariamente - Acompanho ativamente o mercado" }
            ]
        },
        // Etapa 3 - Prazo e Situação Financeira
        {
            id: 5,
            text: "Qual é o prazo dos seus investimentos?",
            step: 3,
            options: [
                { value: 1, text: "Curto prazo - Menos de 2 anos" },
                { value: 2, text: "Médio prazo - 2 a 5 anos" },
                { value: 4, text: "Longo prazo - Mais de 5 anos" }
            ]
        },
        {
            id: 6,
            text: "Qual percentual da sua renda você pode investir sem comprometer seu orçamento?",
            step: 3,
            options: [
                { value: 1, text: "Até 10% - Preciso manter alta liquidez" },
                { value: 2, text: "10% a 30% - Posso investir um valor moderado" },
                { value: 4, text: "Mais de 30% - Posso investir uma parcela significativa" }
            ]
        }
    ];

    constructor(
        private fb: FormBuilder,
        private investmentProfileService: InvestmentProfileService,
        private router: Router
    ) {
        this.questionsForm = this.createForm();
    }

    ngOnInit(): void {
        this.loadExistingProfile();
    }

    createForm(): FormGroup {
        const formControls: { [key: string]: any } = {};

        this.questions.forEach(question => {
            formControls[`question_${question.id}`] = ['', Validators.required];
        });

        return this.fb.group(formControls);
    }

    loadExistingProfile(): void {
        this.investmentProfileService.getCurrentUserProfile().subscribe({
            next: (profile) => {
                if (profile) {
                    this.hasExistingProfile = true;
                    this.existingProfile = profile;
                }
            },
            error: (error) => {
                console.log('Nenhum perfil encontrado ou erro:', error);
                this.hasExistingProfile = false;
            }
        });
    }

    get questionsForCurrentStep(): Question[] {
        return this.questions.filter(q => q.step === this.currentStep);
    }

    isStepValid(): boolean {
        const questionsInStep = this.questionsForCurrentStep;
        return questionsInStep.every(question => {
            const control = this.questionsForm.get(`question_${question.id}`);
            return control && control.valid;
        });
    }

    nextStep(): void {
        if (!this.isStepValid()) return;

        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
        } else {
            this.calculateProfile();
        }
    }

    previousStep(): void {
        if (this.currentStep > 1) {
            this.currentStep--;
        }
    }

    calculateProfile(): void {
        this.loading = true;

        const answers: QuestionnaireAnswer[] = [];
        this.questions.forEach(question => {
            const value = this.questionsForm.get(`question_${question.id}`)?.value;
            if (value) {
                answers.push({
                    questionId: question.id,
                    selectedValue: parseInt(value)
                });
            }
        });

        const questionnaire: QuestionnaireResponseDTO = { answers };

        this.investmentProfileService.calculateProfile(questionnaire).subscribe({
            next: (result) => {
                this.calculationResult = result;
                this.currentStep = 4;
                this.loading = false;
                this.saveProfile();
            },
            error: (error) => {
                console.error('Erro ao calcular perfil:', error);
                this.loading = false;
            }
        });
    }

    saveProfile(): void {
        if (!this.calculationResult) return;

        const profileRequest: InvestorProfileRequestDTO = {
            riskProfile: this.calculationResult.riskProfile,
            riskTolerance: this.calculationResult.riskTolerance,
            investmentTerm: this.calculationResult.investmentTerm,
            knowledgeLevel: this.calculationResult.knowledgeLevel,
            score: this.calculationResult.totalScore
        };

        this.investmentProfileService.saveProfile(profileRequest).subscribe({
            next: (savedProfile) => {
                console.log('Perfil salvo com sucesso:', savedProfile);
            },
            error: (error) => {
                console.error('Erro ao salvar perfil:', error);
            }
        });
    }

    retakeQuestionnaire(): void {
        this.currentStep = 1;
        this.calculationResult = null;
        this.questionsForm.reset();
    }

    goToDashboard(): void {
        this.router.navigate(['/dashboard']);
    }

    // Métodos para conversão de enums em texto
    getRiskProfileText(riskProfile: RiskProfile): string {
        switch (riskProfile) {
            case 'CONSERVATIVE':
                return 'Conservador';
            case 'MODERATE':
                return 'Moderado';
            case 'AGGRESSIVE':
                return 'Agressivo';
            default:
                return 'Não definido';
        }
    }

    getRiskToleranceText(riskTolerance: RiskTolerance): string {
        switch (riskTolerance) {
            case 'LOW':
                return 'Baixa';
            case 'MEDIUM':
                return 'Média';
            case 'HIGH':
                return 'Alta';
            default:
                return 'Não definido';
        }
    }

    getInvestmentTermText(investmentTerm: InvestmentTerm): string {
        switch (investmentTerm) {
            case 'SHORT_TERM':
                return 'Curto Prazo';
            case 'MEDIUM_TERM':
                return 'Médio Prazo';
            case 'LONG_TERM':
                return 'Longo Prazo';
            default:
                return 'Não definido';
        }
    }

    getKnowledgeLevelText(knowledgeLevel: KnowledgeLevel): string {
        switch (knowledgeLevel) {
            case 'BEGINNER':
                return 'Iniciante';
            case 'INTERMEDIATE':
                return 'Intermediário';
            case 'ADVANCED':
                return 'Avançado';
            default:
                return 'Não definido';
        }
    }
}