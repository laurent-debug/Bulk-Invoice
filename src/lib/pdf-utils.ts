// ============================================================
// PDF Utilities — Text extraction, OCR, thumbnail generation
// ============================================================

// Lazy-load pdfjs-dist to avoid SSR issues (DOMMatrix not available in Node.js)
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    // Use local worker file (copied from node_modules to public/)
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
  return pdfjsLib;
}

/**
 * Extract embedded text from a PDF using pdf.js
 */
export async function extractTextFromPDF(blob: Blob): Promise<string> {
  const pdfjs = await getPdfjs();
  const arrayBuffer = await blob.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const textParts: string[] = [];

  for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    textParts.push(pageText);
  }

  return textParts.join('\n');
}

/**
 * OCR a PDF page using Tesseract.js (for scanned documents)
 */
export async function ocrFromPDF(blob: Blob): Promise<string> {
  const pdfjs = await getPdfjs();
  const { createWorker } = await import('tesseract.js');
  const arrayBuffer = await blob.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  // Render first page to canvas
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 }); // Higher scale = better OCR
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;

  // OCR with Tesseract.js
  const worker = await createWorker('fra+deu+eng');
  const { data: { text } } = await worker.recognize(canvas);
  await worker.terminate();

  return text;
}

/**
 * Smart extraction: try embedded text first, fallback to OCR if text is too short
 */
export async function smartExtract(blob: Blob): Promise<{ text: string; ocrUsed: boolean }> {
  const embeddedText = await extractTextFromPDF(blob);

  if (embeddedText.trim().length > 50) {
    return { text: embeddedText, ocrUsed: false };
  }

  // Fallback to OCR for scanned documents
  try {
    const ocrText = await ocrFromPDF(blob);
    return { text: ocrText, ocrUsed: true };
  } catch {
    // If OCR fails, return whatever text we have
    return { text: embeddedText, ocrUsed: false };
  }
}

/**
 * Generate a thumbnail of the first page
 */
export async function generateThumbnail(blob: Blob): Promise<string> {
  const pdfjs = await getPdfjs();
  const arrayBuffer = await blob.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 0.5 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;

  return canvas.toDataURL('image/jpeg', 0.7);
}

/**
 * Render PDF pages as high-resolution images for vision AI
 * Returns base64 JPEG strings (without data:image/jpeg;base64, prefix)
 */
export async function renderPagesAsImages(blob: Blob, maxPages: number = 1): Promise<string[]> {
  const pdfjs = await getPdfjs();
  const arrayBuffer = await blob.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const images: string[] = [];

  for (let i = 1; i <= Math.min(pdf.numPages, maxPages); i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.2 }); // Reduced to 1.2 to minimize Token usage array limits
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;

    // Get base64 without the data URL prefix
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    images.push(dataUrl.replace(/^data:image\/jpeg;base64,/, ''));
  }

  return images;
}

// ============================================================
// Invoice Data Parsing (regex-based, zero AI cost)
// ============================================================

interface ParsedInvoiceData {
  date?: string;
  amount?: number;
  currency: string;
  vendor?: string;
  invoiceNumber?: string;
  paymentMethod?: string;
  dueDate?: string;
}

/**
 * Parse invoice text using regex patterns (supports FR/DE/EN invoices)
 */
export function parseInvoiceData(text: string): ParsedInvoiceData {
  const data: ParsedInvoiceData = {
    currency: extractCurrency(text),
  };
  
  const d = extractDate(text);
  if (d) data.date = d;
  
  const a = extractAmount(text);
  if (a !== null) data.amount = a;
  
  const v = extractVendor(text);
  if (v) data.vendor = v;
  
  const n = extractInvoiceNumber(text);
  if (n) data.invoiceNumber = n;

  const pm = extractPaymentMethod(text);
  if (pm) data.paymentMethod = pm;

  const dd = extractDueDate(text);
  if (dd) data.dueDate = dd;

  return data;
}

function extractDate(text: string): string | null {
  // DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = text.match(/(\d{2})[./](\d{2})[./](\d{4})/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }

  // YYYY-MM-DD
  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return isoMatch[0];
  }

  // DD month YYYY (French months)
  const frMonths: Record<string, string> = {
    'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
    'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
    'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12',
  };
  const frMatch = text.match(/(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/i);
  if (frMatch) {
    const day = frMatch[1].padStart(2, '0');
    const month = frMonths[frMatch[2].toLowerCase()];
    return `${frMatch[3]}-${month}-${day}`;
  }

  return null;
}

function extractAmount(text: string): number | null {
  // Look for amounts near keywords (FR, DE, EN)
  const keywords = [
    'total\\s*ttc', 'montant\\s*ttc', 'total\\s*à\\s*payer', 'net\\s*à\\s*payer',
    'rechnungsbetrag', 'gesamtbetrag', 'endbetrag', 'betrag', 'summe',
    'total', 'amount', 'grand\\s*total', 'total\\s*amount'
  ];
  for (const kw of keywords) {
    const regex = new RegExp(`${kw}[^\\d]{0,20}(\\d[\\d\\s]*[.,]\\d{2})`, 'i');
    const match = text.match(regex);
    if (match) {
      const cleaned = match[1].replace(/\s/g, '').replace(',', '.');
      const value = parseFloat(cleaned);
      if (!isNaN(value) && value > 0) return value;
    }
  }

  // Fallback: find amounts with currency symbols nearby
  const currencyAmountRegex = /(?:CHF|EUR|€|USD|\$|GBP|£)\s*(\d[\d\s]*[.,]\d{2})|(\d[\d\s]*[.,]\d{2})\s*(?:CHF|EUR|€|USD|\$|GBP|£)/gi;
  const matches = [...text.matchAll(currencyAmountRegex)];
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    const amountStr = (lastMatch[1] || lastMatch[2]).replace(/\s/g, '').replace(',', '.');
    const value = parseFloat(amountStr);
    if (!isNaN(value) && value > 0) return value;
  }

  return null;
}

function extractCurrency(text: string): string {
  const upper = text.toUpperCase();
  if (upper.includes('CHF') || upper.includes('FR.')) return 'CHF';
  if (upper.includes('EUR') || text.includes('€')) return 'EUR';
  if (upper.includes('USD') || text.includes('$')) return 'USD';
  if (upper.includes('GBP') || text.includes('£')) return 'GBP';
  return 'CHF'; // Default
}

function extractVendor(text: string): string | null {
  // Try "De :" / "From:" patterns
  const fromMatch = text.match(/(?:de\s*:|from\s*:|expéditeur\s*:|von\s*:)\s*(.+)/i);
  if (fromMatch) {
    return cleanVendorName(fromMatch[1]);
  }

  // Try company identifiers
  const companyPatterns = [
    /(?:SA|SAS|SARL|SàRL|EURL|AG|GmbH|S\.A\.|Sàrl)\b/i,
    /(?:SIRET|SIREN|TVA|IDE|CHE-)\s*[:\s]*[\d.-]+/i,
  ];

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);

  for (const line of lines.slice(0, 10)) {
    for (const pattern of companyPatterns) {
      if (pattern.test(line)) {
        // Extract the company name part (usually before the identifier)
        const name = line.replace(/(?:SIRET|SIREN|TVA|IDE|CHE-)[\s:]*[\d.-]+/gi, '').trim();
        if (name.length > 2) return cleanVendorName(name);
      }
    }
  }

  // Fallback: use first substantial line as vendor
  for (const line of lines.slice(0, 5)) {
    if (line.length > 3 && line.length < 60 && !/^\d/.test(line) && !/facture|invoice|rechnung|date|total/i.test(line)) {
      return cleanVendorName(line);
    }
  }

  return null;
}

function extractInvoiceNumber(text: string): string | null {
  const patterns = [
    /(?:facture|invoice|rechnung|quittance|reçu|bon)\s*[n°#:]+\s*([\w\d-]+)/i,
    /(?:n°|no\.?|number|nummer)\s*[:\s]*([\w\d-]+)/i,
    /(?:ref|réf|référence)\s*[.:\s]*([\w\d-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1].length >= 2) {
      return match[1].trim();
    }
  }

  return null;
}

function extractPaymentMethod(text: string): string | null {
  const upper = text.toUpperCase();
  if (upper.includes('VISA')) return 'Visa';
  if (upper.includes('MASTERCARD')) return 'Mastercard';
  if (upper.includes('TWINT')) return 'TWINT';
  if (upper.includes('AMEX') || upper.includes('AMERICAN EXPRESS')) return 'Amex';
  if (upper.includes('CASH') || upper.includes('ESPÈCES') || upper.includes('BARZAHLUNG')) return 'Cash';
  if (upper.includes('MAESTRO')) return 'Maestro';
  if (upper.includes('PAYPAL')) return 'PayPal';
  return null;
}

function extractDueDate(text: string): string | null {
  const patterns = [
    /(?:due\s*date|date\s*d'échéance|fälligkeitsdatum|échéance|zahlbar\s*bis)\s*[:\s]+(\d{2}[./]\d{2}[./]\d{4})/i,
    /(?:due\s*date|date\s*d'échéance|fälligkeitsdatum|échéance|zahlbar\s*bis)\s*[:\s]+(\d{4}-\d{2}-\d{2})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const d = match[1];
      if (d.includes('-')) return d;
      const parts = d.split(/[./]/);
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return null;
}

function cleanVendorName(name: string): string {
  return name
    .replace(/[^\w\sàâäéèêëïîôùûüÿçœæ&-]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 30);
}
