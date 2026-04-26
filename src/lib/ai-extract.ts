// ============================================================
// AI Extraction — Expert prompting for 98%+ accuracy
// System/user prompt split, language-aware categories,
// vendor sub-branch identification, beneficiary extraction
// ============================================================

export interface AIExtractionResult {
  date?: string;
  amount?: number;
  currency?: string;
  vendor?: string;
  vendorBranch?: string;
  category?: string;
  invoiceNumber?: string;
  paymentMethod?: string;
  dueDate?: string;
  isCreditNote?: boolean;
  beneficiary?: string;
  paymentReference?: string;
  confidence?: number;
  serverIsPro?: boolean;
  serverFilesProcessed?: number;
}

// ── Category Intelligence ────────────────────────────────────
// Multilingual semantic map so the AI can match user categories
// regardless of the document's language.

const CATEGORY_SEMANTICS: Record<string, { fr: string[]; de: string[]; en: string[]; keywords: string[] }> = {
  'Rent':      { fr: ['Loyer', 'Bail', 'Location immobilière'], de: ['Miete', 'Pacht', 'Mietvertrag'], en: ['Rent', 'Lease', 'Property'], keywords: ['loyer', 'bail', 'miete', 'pacht', 'rent', 'lease', 'immobilier'] },
  'Insurance': { fr: ['Assurance', 'Prévoyance', 'Mutuelle', 'Caisse maladie'], de: ['Versicherung', 'Vorsorge', 'Krankenkasse'], en: ['Insurance', 'Coverage', 'Policy'], keywords: ['assurance', 'versicherung', 'insurance', 'police', 'prämie', 'prime', 'franchise', 'sinistre', 'axa', 'allianz', 'zurich', 'helvetia', 'css', 'swica', 'helsana', 'concordia'] },
  'Telecom':   { fr: ['Télécom', 'Téléphone', 'Internet', 'Mobile', 'Fibre'], de: ['Telekommunikation', 'Mobilfunk', 'Internet', 'Telefon'], en: ['Telecom', 'Phone', 'Internet', 'Mobile', 'Broadband'], keywords: ['swisscom', 'sunrise', 'salt', 'orange', 'sfr', 'bouygues', 'free', 'telekom', 'internet', 'mobile', 'fiber', 'fibre', 'natel', 'handy', 'abo'] },
  'Supplies':  { fr: ['Fournitures', 'Matériel de bureau', 'Consommables', 'Papeterie'], de: ['Büromaterial', 'Bürobedarf', 'Zubehör', 'Verbrauchsmaterial'], en: ['Supplies', 'Office supplies', 'Stationery', 'Consumables'], keywords: ['papier', 'toner', 'büro', 'office', 'fournitures', 'cartouche', 'stylo', 'classeur'] },
  'Travel':    { fr: ['Transport', 'Voyage', 'Déplacement', 'Billet', 'Parking'], de: ['Reise', 'Transport', 'Fahrt', 'Flug', 'Parkplatz'], en: ['Travel', 'Transport', 'Flight', 'Train', 'Parking'], keywords: ['sbb', 'cff', 'ffs', 'sncf', 'train', 'vol', 'flug', 'taxi', 'uber', 'bolt', 'parking', 'péage', 'autoroute', 'billet', 'ticket', 'easyjet', 'swiss', 'lufthansa'] },
  'Meals':     { fr: ['Repas', 'Restaurant', 'Restauration', 'Café'], de: ['Mahlzeiten', 'Verpflegung', 'Restaurant', 'Gastronomie'], en: ['Meals', 'Restaurant', 'Food', 'Dining', 'Catering'], keywords: ['restaurant', 'café', 'repas', 'menu', 'essen', 'traiteur', 'catering', 'pizz', 'sushi', 'brasserie', 'bistro'] },
  'Fees':      { fr: ['Honoraires', 'Frais professionnels', 'Cotisations', 'Abonnement', 'Conseil'], de: ['Gebühren', 'Honorar', 'Beitrag', 'Abonnement', 'Beratung'], en: ['Fees', 'Professional fees', 'Subscription', 'Consulting', 'Membership'], keywords: ['honoraires', 'gebühren', 'cotisation', 'beitrag', 'abonnement', 'subscription', 'conseil', 'beratung', 'fiduciaire', 'avocat', 'notaire', 'treuhänder', 'anwalt'] },
  'Energy':    { fr: ['Énergie', 'Électricité', 'Gaz', 'Chauffage', 'Eau'], de: ['Energie', 'Strom', 'Gas', 'Heizung', 'Wasser'], en: ['Energy', 'Electricity', 'Gas', 'Heating', 'Water', 'Utilities'], keywords: ['kwh', 'électricité', 'strom', 'gas', 'ewz', 'romande', 'engie', 'edf', 'alpiq', 'bkw', 'iwb', 'chauffage', 'heizung', 'eau', 'wasser', 'sig'] },
  'Software':  { fr: ['Logiciels', 'Abonnement SaaS', 'Licence', 'Hébergement'], de: ['Software', 'SaaS-Abonnement', 'Lizenz', 'Hosting'], en: ['Software', 'SaaS', 'License', 'Hosting', 'Cloud'], keywords: ['license', 'licence', 'saas', 'cloud', 'microsoft', 'google', 'adobe', 'github', 'aws', 'azure', 'heroku', 'vercel', 'netlify', 'dropbox', 'slack', 'notion', 'figma', 'jetbrains'] },
  'Admin':     { fr: ['Administration', 'Cotisations sociales', 'Taxes', 'Impôts', 'AVS', 'LPP'], de: ['Verwaltung', 'Sozialabgaben', 'Steuern', 'AHV', 'BVG'], en: ['Administration', 'Social contributions', 'Taxes', 'Government'], keywords: ['administration', 'verwaltung', 'cotisation', 'urssaf', 'avs', 'ahv', 'lpp', 'bvg', 'lamal', 'impôt', 'steuer', 'tax', 'commune', 'canton', 'gemeinde', 'centre patronal'] },
  'Health':    { fr: ['Santé', 'Médecin', 'Pharmacie', 'Dentiste', 'Hôpital'], de: ['Gesundheit', 'Arzt', 'Apotheke', 'Zahnarzt', 'Spital'], en: ['Health', 'Medical', 'Pharmacy', 'Dentist', 'Hospital'], keywords: ['médecin', 'arzt', 'pharmacie', 'apotheke', 'dentiste', 'zahnarzt', 'hôpital', 'spital', 'ordonnance', 'rezept', 'consultation', 'analyse', 'labo'] },
  'Marketing': { fr: ['Marketing', 'Publicité', 'Communication', 'Impression'], de: ['Marketing', 'Werbung', 'Kommunikation', 'Druck'], en: ['Marketing', 'Advertising', 'Communications', 'Printing'], keywords: ['publicité', 'werbung', 'ads', 'google ads', 'meta', 'facebook', 'linkedin', 'flyer', 'print', 'impression', 'druck', 'affiche'] },
  'Hardware':  { fr: ['Matériel informatique', 'Équipement', 'Machines'], de: ['Hardware', 'IT-Ausrüstung', 'Geräte', 'Maschinen'], en: ['Hardware', 'IT Equipment', 'Devices', 'Machines'], keywords: ['ordinateur', 'computer', 'laptop', 'monitor', 'bildschirm', 'écran', 'clavier', 'tastatur', 'imprimante', 'drucker', 'serveur', 'server', 'dell', 'hp', 'lenovo', 'apple'] },
  'Cleaning':  { fr: ['Nettoyage', 'Entretien', 'Hygiène'], de: ['Reinigung', 'Unterhalt', 'Hygiene'], en: ['Cleaning', 'Maintenance', 'Hygiene'], keywords: ['nettoyage', 'reinigung', 'entretien', 'unterhalt', 'conciergerie', 'hauswart', 'hygiène'] },
  'Other':     { fr: ['Autre', 'Divers'], de: ['Sonstiges', 'Andere', 'Diverses'], en: ['Other', 'Miscellaneous'], keywords: [] },
};

/**
 * Build language-aware category hints for the user's category list
 */
function buildCategoryIntelligence(categories: string[]): string {
  const lines: string[] = [];
  for (const cat of categories) {
    const sem = CATEGORY_SEMANTICS[cat];
    if (sem) {
      lines.push(`- "${cat}" ← FR: ${sem.fr.join(', ')} / DE: ${sem.de.join(', ')} / Signals: ${sem.keywords.slice(0, 10).join(', ')}`);
    } else {
      // User-defined custom category without a known mapping
      lines.push(`- "${cat}" ← match by semantic proximity to this label`);
    }
  }
  return lines.join('\n');
}

// ── System Prompt (constant, role=system) ────────────────────

const SYSTEM_PROMPT = `You are an expert European invoice & receipt data extractor specialized in Swiss (CH), French (FR), and German (DE) business documents. You have deep knowledge of European accounting conventions, VAT structures, and banking payment systems (BVR, QR-bill, SEPA).

## EXTRACTION PROTOCOL

### 1. AMOUNT — Always the Gross Total (TTC / Brutto)
- Pick the GRAND TOTAL inclusive of all taxes (TVA/MwSt/VAT).
- FR: "Total TTC", "Net à payer", "Montant dû" — NOT "Total HT" or "Sous-total".
- DE: "Rechnungsbetrag", "Gesamtbetrag inkl. MwSt", "Zahlbetrag" — NOT "Nettobetrag".
- EN: "Total Due", "Amount Payable", "Grand Total" — NOT "Subtotal".
- If only ONE total exists, use it.
- Must be a positive number. For credit notes, keep positive but set isCreditNote=true.

### 2. VENDOR vs CUSTOMER — The #1 Source of Errors
- VENDOR (emitter): The company whose logo/letterhead appears. They ISSUE the document. Their address is typically at the top or in a prominent header.
- CUSTOMER (recipient): The entity who RECEIVES and PAYS. Found in "Facturé à" / "Rechnungsadresse" / "Bill to" / "Kunde" sections.
- ⚠ NEVER return the customer as the vendor. If unsure, look for the company registration number (IDE/UID/SIRET/SIREN) — it belongs to the vendor.

### 3. VENDOR HIERARCHY
- "vendor": The CANONICAL brand name a human would say (e.g., "Swisscom", "Amazon", "Coop").
- "vendorBranch": The FULL LEGAL ENTITY printed on the document (e.g., "Swisscom (Schweiz) AG", "Amazon Web Services EMEA SARL", "Coop Genossenschaft"). Look near: company address, registration number, footer, payment details. Suffixes: SA, AG, GmbH, SARL, SAS, Sàrl, Ltd, Inc, SE, eG. If the document only shows the brand name without a distinct legal entity, return null.

### 4. PAYMENT BENEFICIARY — For Bank Reconciliation
- "beneficiary": The EXACT name of the entity receiving payment, as it would appear on a BANK STATEMENT. Found near: IBAN, QR code, payment slip, "Compte bancaire", "Bankverbindung", "Payable to". Often the legal entity name. May differ from the brand.
- "paymentReference": The BANKING REFERENCE code used to match the payment in accounting systems. Look for: QR-Reference, Référence, BVR number (26-27 digits), Zahlungsreferenz, Strukturierte Mitteilung, Reference number, Communication structurée. This is NOT the invoice number — it's a separate banking identifier often printed near the payment slip or QR code.

### 5. CREDIT NOTE DETECTION
Set isCreditNote=true if ANY of these conditions:
- Title: "Avoir", "Note de crédit", "Credit Note", "Gutschrift", "Storno", "Remboursement", "Refund"
- Explicit negative total or "montant négatif"
- Document explicitly states money is returned to the customer

### 6. DATE RULES
- "date": Invoice/receipt date. YYYY-MM-DD format only.
- "dueDate": Payment deadline. YYYY-MM-DD. null if already paid or not found.
- Resolve ambiguous formats (01/02/2024): prefer DD/MM/YYYY for European documents.

### 7. PAYMENT METHOD — Only for Paid Documents
- Only extract if the document is a RECEIPT or shows proof of payment.
- Values: Visa, Mastercard, Amex, Cash, TWINT, PostFinance, Maestro, Debit, PayPal, Bank transfer.
- For unpaid invoices (those with a due date or payment instructions), return null.

### 8. CONFIDENCE SCORING
- 1.0: All main fields clearly readable, unambiguous.
- 0.8-0.9: Most fields clear, one or two required inference.
- 0.6-0.7: Several fields uncertain, document partially readable.
- Below 0.5: Document largely unreadable or irrelevant.

## OUTPUT
Return ONLY a valid JSON object with these exact keys:
{"date","amount","currency","vendor","vendorBranch","category","invoiceNumber","paymentMethod","dueDate","isCreditNote","beneficiary","paymentReference","confidence"}
No markdown. No backticks. No explanation. No trailing comma.`;

// ── User Prompt Builders ─────────────────────────────────────

function buildUserPrompt(
  text: string,
  categories: string[],
  defaultCurrency: string,
  userLang: string,
  hints?: AIExtractionResult
): string {
  const catIntel = buildCategoryIntelligence(categories);
  const hintsBlock = hints
    ? `\nPreliminary regex detections (use as hints to verify, not as ground truth):\n${JSON.stringify(hints)}`
    : '';

  return `Extract data from this document.

Document language context: ${userLang === 'fr' ? 'French' : userLang === 'de' ? 'German' : 'English'}
Default currency if not found: ${defaultCurrency}

CATEGORY RULES — Choose exactly ONE from this list:
${catIntel}
If the document's purpose does not match ANY category above, return "Other".
${hintsBlock}

DOCUMENT TEXT:
${text.substring(0, 4000)}`;
}

function buildVisionUserPrompt(
  categories: string[],
  defaultCurrency: string,
  userLang: string,
  hints?: AIExtractionResult
): string {
  const catIntel = buildCategoryIntelligence(categories);
  const hintsBlock = hints
    ? `\nPreliminary regex detections (use as hints to verify, not as ground truth):\n${JSON.stringify(hints)}`
    : '';

  return `Extract data from this document image. Read every part of the document carefully, including headers, footers, payment slips, QR codes, and fine print.

Document language context: ${userLang === 'fr' ? 'French' : userLang === 'de' ? 'German' : 'English'}
Default currency if not found: ${defaultCurrency}

CATEGORY RULES — Choose exactly ONE from this list:
${catIntel}
If the document's purpose does not match ANY category above, return "Other".
${hintsBlock}`;
}

// ── Public API ───────────────────────────────────────────────

/**
 * Text-based extraction via AI (fallback when vision unavailable)
 */
export async function aiExtractFields(
  text: string,
  categories: string[],
  defaultCurrency: string = 'CHF',
  userLang: string = 'en',
  hints?: AIExtractionResult
): Promise<AIExtractionResult> {
  const userPrompt = buildUserPrompt(text, categories, defaultCurrency, userLang, hints);

  try {
    const response = await callAIProxy(SYSTEM_PROMPT, userPrompt);
    console.log('[AI] Raw response:', response.result);
    const parsed = parseAIResponse(response.result);
    parsed.serverIsPro = response.isPro;
    parsed.serverFilesProcessed = response.filesProcessed;
    return parsed;
  } catch (error) {
    console.error('[AI] Text extraction failed:', error);
    return {};
  }
}

/**
 * Vision-based extraction: send PDF page images for multimodal analysis.
 * Far superior for scanned documents, handwritten text, and QR-bill parsing.
 */
export async function aiExtractWithVision(
  images: string[],
  text: string,
  categories: string[],
  defaultCurrency: string = 'CHF',
  userLang: string = 'en',
  hints?: AIExtractionResult
): Promise<AIExtractionResult> {
  const userPrompt = buildVisionUserPrompt(categories, defaultCurrency, userLang, hints);

  try {
    console.log(`[AI Vision] Sending ${images.length} page image(s)...`);
    const response = await callAIProxy(SYSTEM_PROMPT, userPrompt, images);
    console.log('[AI Vision] Raw response:', response.result);
    const parsed = parseAIResponse(response.result);
    parsed.serverIsPro = response.isPro;
    parsed.serverFilesProcessed = response.filesProcessed;
    return parsed;
  } catch (error) {
    console.error('[AI Vision] Failed:', error);
    console.log('[AI Vision] Falling back to text mode...');
    return aiExtractFields(text, categories, defaultCurrency, userLang, hints);
  }
}

// ── AI Proxy Call ────────────────────────────────────────────

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Call AI through server-side proxy. Now sends systemPrompt separately
 * for proper role-based messaging and JSON mode activation.
 */
async function callAIProxy(systemPrompt: string, userPrompt: string, images?: string[], retryCount = 0): Promise<{ result: string, isPro?: boolean, filesProcessed?: number }> {
  const maxRetries = 6;

  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt,
      prompt: userPrompt,
      images: images || undefined,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));

    // Handle OpenAI Rate Limits (429) with huge exponential backoff to handle 1 minute limits
    if (res.status === 429 && retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 2500 + Math.random() * 2000;
      console.warn(`[AI] Rate limit (429). Retrying in ${Math.round(delay)}ms... (${retryCount + 1}/${maxRetries})`);
      await sleep(delay);
      return callAIProxy(systemPrompt, userPrompt, images, retryCount + 1);
    }

    if (data.error === 'LIMIT_REACHED' || res.status === 403) {
      throw new Error('LIMIT_REACHED');
    }
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(data.error || `Server error: ${res.status}`);
  }

  const data = await res.json();
  return { 
    result: data.result || '', 
    isPro: data.isPro, 
    filesProcessed: data.filesProcessed 
  };
}

// ── Response Parsing & Validation ────────────────────────────

function parseAIResponse(response: string): AIExtractionResult {
  try {
    // Clean any accidental markdown wrapping
    const cleaned = response
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[AI] No JSON found in response:', cleaned.substring(0, 200));
      return {};
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const result: AIExtractionResult = {};

    // ── Date ──
    if (typeof parsed.date === 'string' && parsed.date !== 'null') {
      const d = normalizeDate(parsed.date);
      if (d) result.date = d;
    }

    // ── Amount ──
    if (typeof parsed.amount === 'number' && parsed.amount > 0) {
      result.amount = Math.round(parsed.amount * 100) / 100;
    } else if (typeof parsed.amount === 'string') {
      const num = parseFloat(parsed.amount.replace(/[',\s]/g, '').replace(',', '.'));
      if (!isNaN(num) && num > 0) result.amount = Math.round(num * 100) / 100;
    }

    // ── Currency ──
    if (typeof parsed.currency === 'string' && /^[A-Z]{3}$/.test(parsed.currency.trim())) {
      result.currency = parsed.currency.trim();
    }

    // ── Vendor ──
    if (isValidString(parsed.vendor)) {
      result.vendor = parsed.vendor.trim().substring(0, 40);
    }

    // ── Vendor Branch (legal entity) ──
    if (isValidString(parsed.vendorBranch)) {
      result.vendorBranch = parsed.vendorBranch.trim().substring(0, 80);
    }

    // ── Category ──
    if (isValidString(parsed.category)) {
      result.category = parsed.category.trim();
    }

    // ── Invoice Number ──
    if (isValidString(parsed.invoiceNumber)) {
      result.invoiceNumber = parsed.invoiceNumber.trim();
    }

    // ── Payment Method ──
    if (isValidString(parsed.paymentMethod)) {
      result.paymentMethod = parsed.paymentMethod.trim();
    }

    // ── Due Date ──
    if (typeof parsed.dueDate === 'string' && parsed.dueDate !== 'null') {
      const d = normalizeDate(parsed.dueDate);
      if (d) result.dueDate = d;
    }

    // ── Credit Note ──
    if (typeof parsed.isCreditNote === 'boolean') {
      result.isCreditNote = parsed.isCreditNote;
    } else if (typeof parsed.isCreditNote === 'string') {
      result.isCreditNote = parsed.isCreditNote.toLowerCase() === 'true';
    } else {
      result.isCreditNote = false;
    }

    // ── Beneficiary ──
    if (isValidString(parsed.beneficiary)) {
      result.beneficiary = parsed.beneficiary.trim().substring(0, 80);
    }

    // ── Payment Reference ──
    if (isValidString(parsed.paymentReference)) {
      result.paymentReference = parsed.paymentReference.trim().substring(0, 40);
    }

    // ── Confidence ──
    if (typeof parsed.confidence === 'number') {
      result.confidence = Math.min(1, Math.max(0, parsed.confidence));
    } else {
      result.confidence = 1.0;
    }

    // ── SANITY VALIDATION ──
    const today = new Date().toISOString().split('T')[0];

    // Date cannot be in the future
    if (result.date && result.date > today) {
      console.warn(`[Validation] Date in future (${result.date}), discarding.`);
      result.date = undefined;
    }

    // Amount: reasonable bounds (0 – 500,000)
    if (result.amount !== undefined && (result.amount < 0 || result.amount > 500000)) {
      console.warn(`[Validation] Amount out of bounds (${result.amount}), discarding.`);
      result.amount = undefined;
    }

    // Low confidence or very short vendor → flag
    if ((result.confidence && result.confidence < 0.5) || (result.vendor && result.vendor.length < 2)) {
      console.warn(`[Validation] Low confidence (${result.confidence}) or invalid vendor (${result.vendor}), setting to UNKNOWN.`);
      result.vendor = 'UNKNOWN';
    }

    console.log('[AI] Parsed & validated result:', result);
    return result;
  } catch (err) {
    console.error('[AI] Failed to parse response:', err);
    return {};
  }
}

// ── Helpers ──────────────────────────────────────────────────

function isValidString(val: unknown): val is string {
  return typeof val === 'string' && val !== 'null' && val !== 'undefined' && val.trim().length > 0;
}

/**
 * Normalize various date formats to YYYY-MM-DD
 */
function normalizeDate(raw: string): string | null {
  const s = raw.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // YYMMDD (6 digits)
  if (/^\d{6}$/.test(s)) {
    return `20${s.substring(0, 2)}-${s.substring(2, 4)}-${s.substring(4, 6)}`;
  }

  // DD.MM.YYYY or DD/MM/YYYY (European standard)
  if (/^\d{2}[./]\d{2}[./]\d{4}$/.test(s)) {
    const parts = s.split(/[./]/);
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  // DD.MM.YY or DD/MM/YY
  if (/^\d{2}[./]\d{2}[./]\d{2}$/.test(s)) {
    const parts = s.split(/[./]/);
    return `20${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  // YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) {
    return s.replace(/\//g, '-');
  }

  return null;
}
