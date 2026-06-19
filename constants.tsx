
import { User } from './types';

export const INITIAL_DOCTORS: User[] = [
  { id: 'd1', name: 'Dr. Sarah Chen', email: 'sarah.chen@hospital.com', role: 'Doctor', specialty: 'Geneticist' },
  { id: 'd2', name: 'Dr. Michael Ross', email: 'm.ross@medical.org', role: 'Doctor', specialty: 'Hematologist' },
  { id: 'd3', name: 'Dr. Elena Rodriguez', email: 'elena.r@clinic.io', role: 'Doctor', specialty: 'Pediatrician' },
];

// Mock chart data for predictions history over time
export const CHART_DATA = [
  { day: '01', predictions: 4 },
  { day: '05', predictions: 7 },
  { day: '10', predictions: 5 },
  { day: '15', predictions: 12 },
  { day: '20', predictions: 9 },
  { day: '25', predictions: 15 },
  { day: '30', predictions: 13 },
];

export const getStoredData = (key: string, defaultValue: any) => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultValue;
};

export const setStoredData = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};
