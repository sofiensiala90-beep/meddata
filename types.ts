import React from 'react';

export enum MedicalField {
  Medicine = 'MEDICINE',
  Pharmacy = 'PHARMACY',
  Dentistry = 'DENTISTRY',
  Other = 'OTHER',
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'student' | 'admin';
  coinBalance: number;
  university: string;
  field: MedicalField;
  studyYear: number;
  phoneNumber: string;
  createdAt: string;
  status: 'active' | 'suspended_payment' | 'suspended_manual';
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'choice' | 'checkbox' | 'date' | 'note' | 'range';
  options?: string[];
  condition?: {
    sourceFieldId: string;
    sourceFieldValue: string;
  };
  min?: number;
  max?: number;
}

export interface Form {
  id: string;
  userId: string;
  title: string;
  description: string;
  schema: FormField[];
  status: 'draft' | 'validated' | 'awaiting_modification_decision';
  revalidationFree?: boolean;
  createdAt: string;
  isPublic: boolean;
  price: number;
  pricePerResponse: number;
  responseCount?: number;
  origin?: 'created' | 'purchased';
  orderIndex?: number;
}

export interface FormResponse {
  id:string;
  userId: string; // The user who submitted the response
  formId: string;
  data: Record<string, any>;
  createdAt: string;
}

export interface PurchasedForm {
  id: string;
  userId: string; // The buyer
  formId: string;
  purchasedAt: string;
  withResponses: boolean;
  purchasePrice: number;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export enum TransactionType {
  Credit = 'CREDIT',
  Debit = 'DEBIT',
}

export enum TransactionReason {
  FormValidation = 'FORM_VALIDATION',
  FormResponse = 'FORM_RESPONSE',
  AiRequest = 'AI_REQUEST',
  MonthlyFee = 'MONTHLY_FEE',
  ManualTopup = 'MANUAL_TOPUP',
  AdminAdjustment = 'ADMIN_ADJUSTMENT',
  FormPurchase = 'FORM_PURCHASE',
  ResponseBundlePurchase = 'RESPONSE_BUNDLE_PURCHASE',
  FormSaleCommission = 'FORM_SALE_COMMISSION',
  PlatformCommission = 'PLATFORM_COMMISSION',
  COIN_TRANSFER_SENT = 'COIN_TRANSFER_SENT',
  COIN_TRANSFER_RECEIVED = 'COIN_TRANSFER_RECEIVED',
  PROMOTIONAL_GIFT = 'PROMOTIONAL_GIFT',
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  reason: TransactionReason;
  createdAt: string;
  details?: string;
}

export interface AnalysisHistory {
  id: string;
  userId: string;
  formIds: string[];
  formTitles: string[];
  userPrompt: string;
  analysisResult: any; // The structure from Gemini
  createdAt: string;
}

export enum ActivityType {
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  FORM_CREATED = 'FORM_CREATED',
  FORM_DELETED = 'FORM_DELETED',
  FORM_VALIDATED = 'FORM_VALIDATED',
  FORM_VALIDATION_CANCELLED = 'FORM_VALIDATION_CANCELLED',
  FORM_PUBLISHED = 'FORM_PUBLISHED',
  FORM_PURCHASED = 'FORM_PURCHASED',
  AI_ANALYSIS_PERFORMED = 'AI_ANALYSIS_PERFORMED',
  COIN_TRANSFER = 'COIN_TRANSFER',
  ADMIN_COIN_ADJUSTMENT = 'ADMIN_COIN_ADJUSTMENT',
  USER_STATUS_CHANGED = 'USER_STATUS_CHANGED',
  RESPONSE_ADDED = 'RESPONSE_ADDED',
  SYSTEM_SETTINGS_UPDATED = 'SYSTEM_SETTINGS_UPDATED',
  PROMOTIONAL_CAMPAIGN = 'PROMOTIONAL_CAMPAIGN',
  COMPLAINT_FILED = 'COMPLAINT_FILED',
}

export interface Activity {
  id: string;
  userId: string; // The user who performed the action
  type: ActivityType;
  details: string;
  createdAt: string;
  targetId?: string; // e.g., form ID, recipient user ID
}

// For Gemini API chatbot response
export interface ChatbotResponse {
  text: string;
  action?: 'navigate_formulaires' | 'navigate_bibliotheque' | 'navigate_analyse' | 'navigate_portefeuille' | null;
}

// For Gemini API chat history
export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface SystemSettings {
  coinCosts: {
    validateForm: number;
    validatePurchasedForm: number;
    addResponse: number;
    aiAnalysis: number;
  };
  libraryPrices: {
    defaultFormPrice: number;
    defaultPricePerResponse: number;
  };
  welcomeBonus: number;
  commissionRates: {
    creatorFormSale: number;
    creatorResponseSale: number;
  };
  platformFees: {
    monthly: number;
  };
}