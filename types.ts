import React from 'react';

export enum MedicalField {
  Medicine = 'MEDICINE',
  Pharmacy = 'PHARMACY',
  Dentistry = 'DENTISTRY',
}

export interface User {
  id: string;
  name: string;
  email: string;
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
  validated: boolean;
  createdAt: string;
  isPublic: boolean;
  price: number;
  pricePerResponse: number;
  origin?: 'created' | 'purchased';
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