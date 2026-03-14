// ─── Card Types ──────────────────────────────────────────────────────────────

export type CardBrand =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'discover'
  | 'unionpay'
  | 'jcb'
  | 'rupay'
  | 'custom'
  | 'unknown';

export type CardThemeColorSource = 'detected' | 'manual';

export interface Card {
  id: string;
  name: string;          // Cardholder name
  cardNumber: string;    // Full card number (plain, stored encrypted)
  expiryMonth: string;   // "01" – "12"
  expiryYear: string;    // "25", "26", …
  cvv: string;           // 3–4 digit security code
  nickname: string;      // User-defined label e.g. "Travel Visa"
  brand: CardBrand;
  customBrandName?: string;
  bankName?: string;       // e.g. "HDFC Bank", "Chase"
  validFromMonth?: string; // "01" – "12" (if card shows valid-from date)
  validFromYear?: string;  // "23", "24", …
  cardType?: string;       // e.g. "Debit", "International Debit", "Coral"
  themeColor?: string;     // Hex color used to theme the card in UI
  detectedThemeColor?: string; // Auto-detected color from the scanned image
  themeColorSource?: CardThemeColorSource;
}

// Raw row as returned from SQLite
export interface EncryptedCardRow {
  id: string;
  encrypted_data: string;
  created_at: string;
  updated_at: string;
}

// ─── Export/Import Types ─────────────────────────────────────────────────────

export interface VaultExport {
  /** AES-256-CBC ciphertext, base64 encoded */
  encryptedVault: string;
  /** PBKDF2 salt, hex encoded */
  salt: string;
  /** AES IV, hex encoded */
  iv: string;
  /** Schema version for forward compatibility */
  version: string;
  /** PBKDF2 iteration count — stored so import can derive the same key */
  iterations?: number;
}

export interface VaultExportResult {
  filePath: string;
  filename: string;
  locationDescription: string;
}

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface AuthState {
  isUnlocked: boolean;
  hasPin: boolean;
  hasBiometrics: boolean;
  biometricsEnabled: boolean;
}

// ─── OCR Types ────────────────────────────────────────────────────────────────

export interface OCRCardResult {
  cardNumber?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cardHolderName?: string;  // Detected name to pre-fill the name field
  bankName?: string;        // e.g. "HDFC Bank"
  validFromMonth?: string;
  validFromYear?: string;
  cardType?: string;        // e.g. "Debit", "International Debit"
}
