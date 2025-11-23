import { SystemSettings } from "./types";

// Default settings used if database is empty
export const DEFAULT_SETTINGS: SystemSettings = {
  coinCosts: {
    validateForm: 500,
    validatePurchasedForm: 500,
    addResponse: 10,
    aiAnalysis: 500,
  },
  libraryPrices: {
    defaultFormPrice: 700,
    defaultPricePerResponse: 15,
  },
  welcomeBonus: 500,
  commissionRates: {
    creatorFormSale: 400 / 700,
    creatorResponseSale: 10 / 15,
  },
  platformFees: {
    monthly: 50,
  },
};

// Deprecated: Use settings from App state instead
export const COIN_COSTS = DEFAULT_SETTINGS.coinCosts;
export const PLATFORM_FEES = DEFAULT_SETTINGS.platformFees;
export const LIBRARY_PRICES = DEFAULT_SETTINGS.libraryPrices;
export const COMMISSION_RATES = DEFAULT_SETTINGS.commissionRates;