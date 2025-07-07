import { Routes } from "@angular/router";
import { RegisterComponent } from "./auth/register/register.component";
import { authGuard } from "./auth/auth.guard";
import { HomeComponent } from "./home/home.component"; 

const routeConfig: Routes = [
    { 
        path: 'cadastro', component: RegisterComponent, 
        title: 'Cadastro' 
    },
    { 
        path: '', 
        component: HomeComponent, 
        title: 'Home',
        pathMatch: 'full'
    },
    //  { 
    //     path: 'login',          
    //     component: LoginComponent, 
    //     title: 'Login' 
    // },
    {
        path: 'home',
        component: HomeComponent, 
        title: 'Home'
    }
];

export default routeConfig;