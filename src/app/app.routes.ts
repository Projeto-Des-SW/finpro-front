import { Routes } from "@angular/router";
import { RegisterComponent } from "./auth/register/register.component";
import { LoginComponent } from "./auth/login/login.component";
import { DashboardComponent } from "./dashboard/dashboard.component";
import { IncomeListComponent } from "./income/income-list.component";
import { authGuard } from "./auth/auth.guard";
import { HomeComponent } from "./home/home.component"; 

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
        path: 'receitas',
        component: IncomeListComponent,
        title: 'Receitas - FinPro',
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