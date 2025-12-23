
import { User, Form, FormResponse, Transaction, Notification, MedicalField, AnalysisHistory, PurchasedForm, Activity } from '../types';

// The admin user is now used only for the initial seeding of the Firestore database if no admin exists.
export const mockAdminUser: Omit<User, 'id'> = {
    name: 'Administration DASS',
    email: 'sofiensiala90@gmail.com',
    // password: 'Sofien@1990', // This will be used for initial creation only
    role: 'admin',
    coinBalance: Infinity,
    university: 'Administration DASS',
    field: MedicalField.Medicine,
    studyYear: 10,
    phoneNumber: '0123456789',
    createdAt: new Date('2022-12-01T10:00:00Z').toISOString(),
    status: 'active',
};

// These arrays are now empty as all data will be fetched from Firestore.
export const mockUsers: User[] = [];
export const mockForms: Form[] = [];
export const mockFormResponses: FormResponse[] = [];
export const mockPurchasedForms: PurchasedForm[] = [];
export const mockTransactions: Transaction[] = [];
export const mockNotifications: Notification[] = [];
export const mockAnalysisHistory: AnalysisHistory[] = [];
export const mockActivities: Activity[] = [];
