export interface EducationalContent {
  id?: number;
  title: string;
  description: string;
  videoUrl?: string;
  fileUrl?: string;
  category: string;
}

export interface EducationalContentResponse {
  id: number;
  title: string;
  description: string;
  videoUrl?: string;
  fileUrl?: string;
  category: string;
}