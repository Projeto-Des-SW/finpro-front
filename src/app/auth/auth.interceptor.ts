import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  
  console.log('Interceptor executando para:', req.url);
  
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}` 
      }
    });
    
    console.log('Token adicionado na requisição');
    return next(authReq);
  }
  
  console.log('Requisição sem token');
  return next(req);
};