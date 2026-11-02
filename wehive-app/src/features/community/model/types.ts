export interface Story {
  id: string;
  title: string;
  excerpt?: string;
  body?: string;
  author?: string;
  country?: string;
  university?: string;
  image?: string;
  published_at?: string;
}

export interface Interview {
  id: string;
  title: string;
  person?: string;
  country?: string;
  university?: string;
  excerpt?: string;
  published_at?: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  answer?: string;
  visa_type?: string;
  country?: string;
}

export interface VisaType {
  id: string;
  name: string;
  country?: string;
  description?: string;
}
