// ============================================================
// AI Extraction — BYOK (Bring Your Own Key)
// Uses server-side proxy at /api/ai to avoid CORS issues
// ============================================================

export interface AIExtractionResult {
  date?: string;
  amount?: number;
  currency?: string;
  vendor?: string;
  category?: string;
  invoiceNumber?: string;
  paymentMethod?: string;
  dueDate?: string;
  isCreditNote?: boolean;
}

/**
 * Build a strict, directive prompt for invoice data extraction
 */
function buildPrompt(text: string, categories: string[], defaultCurrency: string, userLang: string = 'en', hints?: AIExtractionResult): string {
  const categoriesStr = categories.join(', ');
  const hintsStr = hints ? `\n\nPreliminary detections (verify these): ${JSON.stringify(hints)}` : '';

  return `You are an expert invoice data extractor. Analyze the provided text and return ONLY a valid JSON object.
No markdown, no backticks, no preamble.

Required Fields:
- "date": string in "YYYY-MM-DD" format.
- "amount": decimal number (total inclusive of tax). MUST be a number, NOT a string.
- "currency": 3-letter currency code (CHF, EUR, USD, GBP). Default: "${defaultCurrency}".
- "vendor": company/store name (e.g., "Swisscom", "Amazon", "Migros", "Lidl").
- "category": choose the BEST MATCH from this exact list: [${categoriesStr}]. You MUST pick one of these. DO NOT invent new categories. If nothing matches perfectly, pick the closest logical category (e.g. pick "Supplies" or "Other" if uncertain).
- "invoiceNumber": the invoice/receipt/reference number if present.
- "paymentMethod": for paid documents/receipts, identify the method (e.g., "Visa", "Mastercard", "Cash", "TWINT", "Amex"). If not paid or unknown, return null.
- "dueDate": for unpaid invoices, identify the deadline/due date in "YYYY-MM-DD" format. If already paid or not found, return null.
- "isCreditNote": boolean (true/false). YOU MUST CHECK CAREFULLY if this is a Credit Note, Refund, Avoir, Note de crédit, Gutschrift, or Storno. If it indicates money returned to the customer, or a negative total, set to true.

Strict Rules:
1. Support French (Facture, Total, Avoir), German (Rechnung, Betrag, Quittung, Gutschrift), and English (Invoice, Receipt, Credit Note, Refund).
2. Use the following language for vendor identification and any text analysis: ${userLang}.
3. If a value is missing, return null or false for boolean.
4. "amount" must be a number (absolute value of the total). If it's a credit note with a negative total, make the amount positive but set isCreditNote to true.
5. "date" must be YYYY-MM-DD.
6. The "vendor" is the company name emitting the document.
7. Look for the GRAND TOTAL (Total TTC / Rechnungsbetrag).${hintsStr}

Invoice Text:
${text.substring(0, 4000)}`;
}

/**
 * Call AI API via server-side proxy to extract invoice fields
 */
export async function aiExtractFields(
  text: string,
  categories: string[],
  defaultCurrency: string = 'CHF',
  userLang: string = 'en',
  hints?: AIExtractionResult
): Promise<AIExtractionResult> {
  const prompt = buildPrompt(text, categories, defaultCurrency, userLang, hints);

  try {
    const response = await callAIProxy(prompt);
    console.log('[AI] Raw response:', response);
    return parseAIResponse(response);
  } catch (error) {
    console.error('[AI] Text extraction failed:', error);
    return {};
  }
}

/**
 * Vision mode: send PDF page images directly to multimodal AI
 * Much better for scanned documents & handwritten text
 */
export async function aiExtractWithVision(
  images: string[],
  text: string,
  categories: string[],
  defaultCurrency: string = 'CHF',
  userLang: string = 'en',
  hints?: AIExtractionResult
): Promise<AIExtractionResult> {

  const hintsStr = hints ? `\n\nPreliminary detections (verify these): ${JSON.stringify(hints)}` : '';

  const prompt = `You are an expert invoice data extractor via Vision. Analyze this document image.
Return ONLY a valid JSON object. No markdown, no backticks.

Required Fields:
- "date": string in "YYYY-MM-DD" format.
- "amount": decimal number (total inclusive of tax). MUST be a number.
- "currency": 3-letter currency code (CHF, EUR, USD, GBP). Default: "${defaultCurrency}".
- "vendor": company/store name visible on the document.
- "category": choose the BEST MATCH from this exact list: [${categories.join(', ')}]. You MUST pick one of these. DO NOT invent new categories.
- "invoiceNumber": the invoice/receipt number if visible.
- "paymentMethod": identify payment method for receipts (Visa, Mastercard, Cash, TWINT).
- "dueDate": identify due date for unpaid invoices in "YYYY-MM-DD" format.
- "isCreditNote": boolean (true/false). YOU MUST CHECK CAREFULLY if this is a Credit Note, Refund, Avoir, Note de crédit, Gutschrift, or Storno. If the document indicates money returned or has a negative total, set to true.

Strict Rules:
1. Support French, German (Rechnung, Betrag, Datum, Gutschrift), and English.
2. User's primary language is ${userLang}.
3. Read the entire document carefully, including handwritten notes.
4. If a value is missing, return null or false for boolean.
5. "amount" must be a number (absolute positive value, even for credit notes).
6. Search for the GRAND TOTAL (Total TTC / Rechnungsbetrag / Total Amount).${hintsStr}`;

  try {
    console.log(`[AI Vision] Sending ${images.length} page image(s)...`);
    const response = await callAIProxy(prompt, images);
    console.log('[AI Vision] Raw response:', response);
    return parseAIResponse(response);
  } catch (error) {
    console.error('[AI Vision] Failed:', error);
    // Fall back to text-based extraction
    console.log('[AI Vision] Falling back to text mode...');
    return aiExtractFields(text, categories, defaultCurrency, userLang, hints);
  }
}


/**
 * Call AI through our server-side proxy
 */
async function callAIProxy(prompt: string, images?: string[]): Promise<string> {
  const res = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      images: images || undefined,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    if (data.error === 'LIMIT_REACHED' || res.status === 403) {
      throw new Error('LIMIT_REACHED');
    }
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(data.error || `Erreur serveur: ${res.status}`);
  }

  const data = await res.json();
  return data.result || '';
}

function parseAIResponse(response: string): AIExtractionResult {
  try {
    // Clean response: remove backticks, markdown formatting
    const cleaned = response
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    // Extract JSON from response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[AI] No JSON found in response:', cleaned);
      return {};
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and normalize each field
    const result: AIExtractionResult = {};

    // Date: must be YYYY-MM-DD format
    if (typeof parsed.date === 'string' && parsed.date !== 'null') {
      // Handle various formats the AI might return
      const dateStr = parsed.date.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        result.date = dateStr;
      } else if (/^\d{6}$/.test(dateStr)) {
        // YYMMDD → YYYY-MM-DD
        const yy = dateStr.substring(0, 2);
        const mm = dateStr.substring(2, 4);
        const dd = dateStr.substring(4, 6);
        result.date = `20${yy}-${mm}-${dd}`;
      } else if (/^\d{2}[./]\d{2}[./]\d{4}$/.test(dateStr)) {
        // DD.MM.YYYY or DD/MM/YYYY
        const parts = dateStr.split(/[./]/);
        result.date = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    // Amount: must be a number
    if (typeof parsed.amount === 'number' && parsed.amount > 0) {
      result.amount = Math.round(parsed.amount * 100) / 100;
    } else if (typeof parsed.amount === 'string') {
      const num = parseFloat(parsed.amount.replace(',', '.'));
      if (!isNaN(num) && num > 0) result.amount = Math.round(num * 100) / 100;
    }

    // Currency
    if (typeof parsed.currency === 'string' && /^[A-Z]{3}$/.test(parsed.currency.trim())) {
      result.currency = parsed.currency.trim();
    }

    // Vendor
    if (typeof parsed.vendor === 'string' && parsed.vendor !== 'null' && parsed.vendor.length > 0) {
      result.vendor = parsed.vendor.trim().substring(0, 30);
    }

    // Category
    if (typeof parsed.category === 'string' && parsed.category !== 'null' && parsed.category.length > 0) {
      result.category = parsed.category.trim();
    }

    // Invoice number
    if (typeof parsed.invoiceNumber === 'string' && parsed.invoiceNumber !== 'null' && parsed.invoiceNumber.length > 0) {
      result.invoiceNumber = parsed.invoiceNumber.trim();
    }
    
    // Payment Method
    if (typeof parsed.paymentMethod === 'string' && parsed.paymentMethod !== 'null' && parsed.paymentMethod.length > 0) {
      result.paymentMethod = parsed.paymentMethod.trim();
    }

    // Due Date
    if (typeof parsed.dueDate === 'string' && parsed.dueDate !== 'null') {
      const dateStr = parsed.dueDate.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        result.dueDate = dateStr;
      } else if (/^\d{2}[./]\d{2}[./]\d{4}$/.test(dateStr)) {
        const parts = dateStr.split(/[./]/);
        result.dueDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    // Is Credit Note
    if (typeof parsed.isCreditNote === 'boolean') {
      result.isCreditNote = parsed.isCreditNote;
    } else if (typeof parsed.isCreditNote === 'string') {
      result.isCreditNote = parsed.isCreditNote.toLowerCase() === 'true';
    } else {
      result.isCreditNote = false;
    }

    console.log('[AI] Parsed result:', result);
    return result;
  } catch (err) {
    console.error('[AI] Failed to parse response:', err);
    return {};
  }
}
