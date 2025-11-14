import { User, Form, FormResponse, Transaction, Notification, MedicalField, TransactionReason, TransactionType, AnalysisHistory, PurchasedForm, Activity } from '../types';

export const mockUsers: User[] = [
  {
    id: 'user-2',
    name: 'Sofien SIALA',
    email: 'sofiensiala90@gmail.com',
    password: 'Sofien@1990',
    role: 'admin',
    coinBalance: Infinity,
    university: 'Administration MedataAI',
    field: MedicalField.Medicine,
    studyYear: 10,
    phoneNumber: '0123456789',
    createdAt: new Date('2022-12-01T10:00:00Z').toISOString(),
    status: 'active',
  },
];

export const mockForms: Form[] = [];

export const mockFormResponses: FormResponse[] = [];

export const mockPurchasedForms: PurchasedForm[] = [];

export const mockTransactions: Transaction[] = [];

export const mockNotifications: Notification[] = [];

export const mockAnalysisHistory: AnalysisHistory[] = [];

export const mockActivities: Activity[] = [];
