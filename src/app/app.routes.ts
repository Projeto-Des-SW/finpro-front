import { Routes } from "@angular/router";
import { RegisterComponent } from "./auth/register/register.component";
import { LoginComponent } from "./auth/login/login.component";
import { DashboardComponent } from "./dashboard/dashboard.component";
import { IncomeComponent } from "./income/income.component";
import { authGuard } from "./auth/auth.guard";
import { HomeComponent } from "./home/home.component"; 
import { ExpenseComponent } from "./expense/expense.component";
import { TransactionComponent } from "./transaction/transaction.component";

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
        path: 'transacoes',
        component: TransactionComponent,
        title: 'Transações - FinPro',
        canActivate: [authGuard]
    },
    {
        path: 'receitas',
        component: IncomeComponent,
        title: 'Receitas - FinPro',
        canActivate: [authGuard]
    },
    {
        path: 'despesas',
        component: ExpenseComponent,
        title: 'Despesas - FinPro',
        canActivate: [authGuard]
    },
    {
        path: 'dashboard',
        component: DashboardComponent,
        title: 'Dashboard',
        canActivate: [authGuard]     
    },
    {
        path: 'home',               
        component: HomeComponent, 
        title: 'Home'
    }
];

export default routeConfig;