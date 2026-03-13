// ============================================================
// Bulk-Invoice-Formatting — Core Types
// ============================================================

export type TokenType = 'date' | 'amount' | 'currency' | 'vendor' | 'category' | 'invoiceNumber' | 'paymentMethod' | 'dueDate';
export type SeparatorType = '_' | '-' | '.' | ' ';
export type DateFormatType = 'YYMMDD' | 'YYYY-MM-DD' | 'DD-MM-YYYY';
export type AIProvider = 'gemini' | 'openai' | 'deepseek';
export type ExportDestination = 'zip' | 'gdrive';
export type ExportGrouping = 'none' | 'vendor' | 'category' | 'month';

export interface InvoiceFile {
  id: string;
  originalName: string;
  fileSize: number;
  fileBlob: Blob;
  thumbnailDataUrl: string;
  ocrUsed: boolean;
  extractedDate: string | null;       // ISO string
  extractedAmount: number | null;
  extractedCurrency: string;          // default "CHF"
  extractedVendor: string | null;
  extractedInvoiceNumber: string | null;
  category: string;                   // manual or AI-assisted
  isSelected: boolean;
  newName: string;                    // computed
  extractionStatus: 'pending' | 'extracting' | 'done' | 'error';
  paymentMethod: string | null;       // Visa, Mastercard, Cash, etc.
  dueDate: string | null;             // ISO string for unpaid invoices
  isCreditNote: boolean;              // detected or manual override
  extractionError?: string;
}

export interface NamingPattern {
  raw: string; // ex: "[date]_[amount]_[vendor]"
  dateFormat: DateFormatType;
  defaultCurrency: string;
  showCurrencyAlways: boolean;
}

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  enabled: boolean;
  visionEnabled: boolean;
}

export interface KDriveConfig {
  driveId: string;
  email: string;
  appPassword: string;
  targetFolder: string;
}

export interface BatchRecord {
  id: string;
  processedAt: string;                // ISO string
  fileCount: number;
  patternUsed: NamingPattern;
  destination: ExportDestination;
}

// AI provider model mapping
export const AI_MODELS: Record<AIProvider, { model: string; name: string; inputCostPer1M: number; description: string }> = {
  gemini: {
    model: 'gemini-2.0-flash',
    name: 'Google Gemini 2.0 Flash',
    inputCostPer1M: 0.10,
    description: 'Cheapest, fast and efficient',
  },
  openai: {
    model: 'gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini',
    inputCostPer1M: 0.15,
    description: 'Good balance of quality and price',
  },
  deepseek: {
    model: 'deepseek-chat',
    name: 'DeepSeek V3',
    inputCostPer1M: 0.27,
    description: 'Budget alternative',
  },
};

export const DEFAULT_CATEGORIES = [
  'Rent',
  'Insurance',
  'Telecom',
  'Supplies',
  'Travel',
  'Meals',
  'Fees',
  'Energy',
  'Other',
];

export const DEFAULT_PATTERN: NamingPattern = {
  raw: '[date]_[amount]_[currency]_[vendor]_[category]_[invoiceNumber]',
  dateFormat: 'YYMMDD',
  defaultCurrency: 'CHF',
  showCurrencyAlways: false,
};
