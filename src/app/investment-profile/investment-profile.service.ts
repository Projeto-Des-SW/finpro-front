import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

import { 
  QuestionnaireResponseDTO, 
  ProfileCalculationResultDTO, 
  InvestorProfileRequestDTO, 
  InvestorProfileResponseDTO 
} from '../entity/investment-profile';


@Injectable({
  providedIn: 'root'
})
export class InvestmentProfileService {
  private apiUrl = `${environment.apiUrl}/investor-profile`;

  constructor(private http: HttpClient) {}

  calculateProfile(questionnaire: QuestionnaireResponseDTO): Observable<ProfileCalculationResultDTO> {
    return this.http.post<ProfileCalculationResultDTO>(
      `${this.apiUrl}/calculate`, 
      questionnaire
    );
  }

  getCurrentUserProfile(): Observable<InvestorProfileResponseDTO> {
    return this.http.get<InvestorProfileResponseDTO>(`${this.apiUrl}/current`);
  }

  saveProfile(profile: InvestorProfileRequestDTO): Observable<InvestorProfileResponseDTO> {
    return this.http.post<InvestorProfileResponseDTO>(`${this.apiUrl}`, profile);
  }
}