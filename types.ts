
export enum RiskLevel {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export type Role = 'Doctor' | 'User';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  specialty?: string; // Only for doctors
}

export interface Prediction {
  id: string;
  userId: string; // The patient who owns the record
  patientName: string;
  patientAge: string;
  patientSex: string;
  date: string;
  status: 'Pending Review' | 'Reviewed' | 'Action Required';
  riskLevel: RiskLevel;
  riskScore: number;
  reasoning: string;
  suggestedNextSteps: string[];
  reviewingDoctorId: string;
  doctorComment?: string;
  reviewedAt?: string;
}

export interface ChartData {
  date: string;
  predictions: number;
}
