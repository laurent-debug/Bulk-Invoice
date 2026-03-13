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
}

/**
 * Build a strict, directive prompt for invoice data extraction
 */
function buildPrompt(text: string, categories: string[], defaultCurrency: string, hints?: AIExtractionResult): string {
  const categoriesStr = categories.join(', ');
  const hintsStr = hints ? `\n\nPreliminary detections (verify these): ${JSON.stringify(hints)}` : '';

  return `You are an expert invoice data extractor. Analyze the provided text and return ONLY a valid JSON object.
No markdown, no backticks, no preamble.

Required Fields:
- "date": string in "YYYY-MM-DD" format.
- "amount": decimal number (total inclusive of tax). MUST be a number, NOT a string.
- "currency": 3-letter currency code (CHF, EUR, USD, GBP). Default: "${defaultCurrency}".
- "vendor": company/store name (e.g., "Swisscom", "Amazon", "Migros", "Lidl").
- "category": choose the best from [${categoriesStr}].
- "invoiceNumber": the invoice/receipt/reference number if present.

Strict Rules:
1. Support French (Facture, Total), German (Rechnung, Betrag, Quittung), and English.
2. If a value is missing, return null.
3. "amount" must be a number (e.g., 12.50), never a string.
4. "date" must be YYYY-MM-DD.
5. The "vendor" is the company name, not their address.
6. Look for the GRAND TOTAL (Total TTC / Rechnungsbetrag).${hintsStr}

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
  hints?: AIExtractionResult
): Promise<AIExtractionResult> {
  const prompt = buildPrompt(text, categories, defaultCurrency, hints);

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
- "category": choose the best from [${categories.join(', ')}].
- "invoiceNumber": the invoice/receipt number if visible.

Strict Rules:
1. Support French, German (Rechnung, Betrag, Datum), and English.
2. Read the entire document carefully, including handwritten notes.
3. If a value is missing, return null.
4. "amount" must be a number (e.g., 7.70), never a string.
5. Search for the GRAND TOTAL (Total TTC / Rechnungsbetrag / Total Amount).${hintsStr}`;

  try {
    console.log(`[AI Vision] Sending ${images.length} page image(s)...`);
    const response = await callAIProxy(prompt, images);
    console.log('[AI Vision] Raw response:', response);
    return parseAIResponse(response);
  } catch (error) {
    console.error('[AI Vision] Failed:', error);
    // Fall back to text-based extraction
    console.log('[AI Vision] Falling back to text mode...');
    return aiExtractFields(text, categories, defaultCurrency, hints);
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

    console.log('[AI] Parsed result:', result);
    return result;
  } catch (err) {
    console.error('[AI] Failed to parse response:', err);
    return {};
  }
}
