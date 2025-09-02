// src/app/app.routes.ts - VERSÃO FINAL CORRIGIDA
import { Routes } from "@angular/router";
import { RegisterComponent } from "./auth/register/register.component";
import { LoginComponent } from "./auth/login/login.component";
import { DashboardComponent } from "./dashboard/dashboard.component";
import { IncomeComponent } from "./income/income.component";
import { authGuard } from "./auth/auth.guard";
import { HomeComponent } from "./home/home.component"; 
import { ExpenseComponent } from "./expense/expense.component";
import { TransactionComponent } from "./transaction/transaction.component";
import { PiggyBankComponent } from "./piggy-bank/piggy-bank.component";
import { LayoutComponent } from "./navbar/layout/layout.component";
import { EducationalContentComponent } from "./educational-content/educational-content.component";

const routeConfig: Routes = [
    { 
        path: '', 
        redirectTo: '/cadastro',  
        pathMatch: 'full'
    },
    
    { 
        path: 'login',
        component: LoginComponent, 
        title: 'Login - FinPro' 
    },
    { 
        path: 'cadastro', 
        component: RegisterComponent, 
        title: 'Cadastro - FinPro' 
    },
    {
        path: 'home',               
        component: HomeComponent, 
        title: 'Home'
    },
    
    {
        path: 'app',
        component: LayoutComponent,
        canActivate: [authGuard],
        children: [
            // /app -> /app/dashboard
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            // /app/dashboard
            {
                path: 'dashboard',
                component: DashboardComponent,
                title: 'Dashboard - FinPro'
            },
            // /app/transacoes
            {
                path: 'transacoes',
                component: TransactionComponent,
                title: 'Transações - FinPro'
            },
            // /app/receitas
            {
                path: 'receitas',
                component: IncomeComponent,
                title: 'Receitas - FinPro'
            },
            // /app/despesas
            {
                path: 'despesas',
                component: ExpenseComponent,
                title: 'Despesas - FinPro'
            },
            // /app/cofrinhos
            {
                path: 'cofrinhos',
                component: PiggyBankComponent,
                title: 'Cofrinhos - FinPro'
            },

            // /app/conteudo-educacional
            {
                path: 'conteudo-educacional',
                component: EducationalContentComponent,
                title: 'Conteúdo Educacional - FinPro'
            }
        ]
    },
    
    {
        path: '**',
        redirectTo: '/cadastro'
    }
];

export default routeConfig;