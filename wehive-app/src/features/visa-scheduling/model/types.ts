export interface AppointmentSlot {
  _id: string;
  date: string;
  time: string;
  booked: boolean;
}

export interface Appointment {
  _id: string;
  country_id: string;
  country_name: string;
  embassy: string;
  date: string;
  time: string;
  status: 'confirmed' | 'cancelled' | 'completed';
}

export interface Embassy {
  _id: string;
  name: string;
  city: string;
  address: string;
}

export interface PrepItem {
  _id: string;
  title: string;
  done: boolean;
}

export interface UserApplication {
  _id: string;
  applicant_name?: string;
  visa_type: string;
  country_id: string;
  country_name?: string;
  status: string;
}

export const EMBASSY_CITIES = [
  { id: 'delhi', name: 'New Delhi' },
  { id: 'mumbai', name: 'Mumbai' },
  { id: 'kolkata', name: 'Kolkata' },
  { id: 'chennai', name: 'Chennai' },
  { id: 'bangalore', name: 'Bangalore' },
  { id: 'hyderabad', name: 'Hyderabad' },
];
