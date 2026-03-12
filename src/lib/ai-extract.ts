// ============================================================
// AI Extraction — BYOK (Bring Your Own Key)
// Uses server-side proxy at /api/ai to avoid CORS issues
// ============================================================
import type { AIConfig } from './types';

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
function buildPrompt(text: string, categories: string[], defaultCurrency: string): string {
  return `Tu es un extracteur de factures expert. Retourne UNIQUEMENT un JSON valide, sans backticks, sans markdown, sans texte avant/après.

Champs obligatoires :
- "date": string au format "YYYY-MM-DD" (date de la facture/ticket). Si tu trouves "11.03.2026" → "2026-03-11"
- "amount": nombre avec 2 décimales (total TTC / montant total de la facture). DOIT être un nombre, PAS une string. Ex: 7.70
- "currency": code devise en 3 lettres (CHF, EUR, USD, GBP). Par défaut "${defaultCurrency}" si non précisé
- "vendor": string (nom du fournisseur/enseigne/magasin, PAS l'adresse)
- "category": une parmi [${categories.join(', ')}]. Choisis la plus pertinente
- "invoiceNumber": string (numéro de facture/reçu/ticket si présent)

Règles strictes :
- Si une valeur est introuvable : mets null
- "amount" DOIT être un nombre (ex: 7.70), JAMAIS une string
- "date" DOIT être au format YYYY-MM-DD
- Le fournisseur est l'enseigne/société émettrice (ex: "Denner", "Migros", "Swisscom"), PAS une adresse
- Réponds UNIQUEMENT avec le JSON, rien d'autre

Texte de la facture :
${text.substring(0, 4000)}`;
}

/**
 * Call AI API via server-side proxy to extract invoice fields
 */
export async function aiExtractFields(
  text: string,
  categories: string[],
  config: AIConfig,
  defaultCurrency: string = 'CHF'
): Promise<AIExtractionResult> {
  const prompt = buildPrompt(text, categories, defaultCurrency);

  try {
    const response = await callAIProxy(prompt, config);
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
  config: AIConfig,
  defaultCurrency: string = 'CHF'
): Promise<AIExtractionResult> {
  // DeepSeek doesn't support vision — fall back to text mode
  if (config.provider === 'deepseek') {
    return aiExtractFields(text, categories, config, defaultCurrency);
  }

  const prompt = `Tu es un extracteur de factures expert. Analyse cette image de facture/ticket de caisse.
Retourne UNIQUEMENT un JSON valide, sans backticks, sans markdown, sans texte avant/après.

Champs obligatoires :
- "date": string au format "YYYY-MM-DD" (date de la facture/ticket)
- "amount": nombre avec 2 décimales (total TTC / montant total). DOIT être un nombre, PAS une string. Inclus les montants manuscrits.
- "currency": code devise en 3 lettres (CHF, EUR, USD, GBP). Par défaut "${defaultCurrency}"
- "vendor": string (nom de l'enseigne/magasin/fournisseur visible sur le document)
- "category": une parmi [${categories.join(', ')}]
- "invoiceNumber": string (numéro de facture/reçu/ticket si visible)

Règles strictes :
- Lis TOUT le document attentivement, y compris les montants écrits à la main
- Si une valeur est introuvable : mets null
- "amount" DOIT être un nombre (ex: 7.70), JAMAIS une string
- "date" DOIT être au format YYYY-MM-DD
- Le fournisseur est l'enseigne/société (ex: "Denner", "Migros"), PAS l'adresse
- Cherche le TOTAL TTC (pas les sous-totaux)`;

  try {
    console.log(`[AI Vision] Sending ${images.length} page image(s) to ${config.provider}...`);
    const response = await callAIProxy(prompt, config, images);
    console.log('[AI Vision] Raw response:', response);
    return parseAIResponse(response);
  } catch (error) {
    console.error('[AI Vision] Failed:', error);
    // Fall back to text-based extraction
    console.log('[AI Vision] Falling back to text mode...');
    return aiExtractFields(text, categories, config, defaultCurrency);
  }
}

/**
 * Test if the provided API key works
 */
export async function testAIConnection(config: AIConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await callAIProxy('Réponds uniquement avec le mot "OK".', config);
    return { success: response.length > 0 };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}

/**
 * Call AI through our server-side proxy (avoids CORS issues)
 */
async function callAIProxy(prompt: string, config: AIConfig, images?: string[]): Promise<string> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model,
      prompt,
      images: images || undefined,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
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
