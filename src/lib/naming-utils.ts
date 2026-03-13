// ============================================================
// Naming Utilities — File name generation from pattern
// ============================================================
import type { InvoiceFile, NamingPattern } from './types';

/**
 * Generate a file name based on the naming pattern
 */
export function generateFileName(file: InvoiceFile, pattern: NamingPattern): string {
  // Fallback for old persisted format (tokens + separator)
  let fileName = pattern.raw || '[date]_[amount]_[currency]_[vendor]_[category]_[invoiceNumber]';

  // Replace tokens like [date], [amount], [paymentMethod], etc.
  fileName = fileName.replace(/\[(date|amount|currency|vendor|category|invoiceNumber|paymentMethod|dueDate)\]/g, (match, token) => {
    return getTokenValue(file, token, pattern) || '';
  });

  // Fallback: if fileName becomes empty, use original name but sanitized
  if (!fileName.trim()) {
    return file.originalName;
  }

  const result = fileName.trim();
  const prefix = file.isCreditNote ? 'AVOIR-' : '';
  return `${prefix}${result}.pdf`;
}

function getTokenValue(
  file: InvoiceFile,
  token: string,
  pattern: NamingPattern
): string | null {
  switch (token) {
    case 'date':
      return formatDate(file.extractedDate, pattern.dateFormat);

    case 'amount':
      if (file.extractedAmount === null) return '0.00';
      const absAmount = Math.abs(file.extractedAmount).toFixed(2);
      return file.isCreditNote ? `-${absAmount}` : absAmount;

    case 'currency':
      // Return currency if showCurrencyAlways is true
      if (pattern.showCurrencyAlways) {
        return file.extractedCurrency;
      }
      // Skip if same as default currency
      if (file.extractedCurrency === pattern.defaultCurrency) {
        return null;
      }
      return file.extractedCurrency;

    case 'vendor':
      return file.extractedVendor
        ? sanitize(file.extractedVendor, 30)
        : 'INCONNU';

    case 'category':
      return file.category || 'SANS-CAT';

    case 'invoiceNumber':
      return file.extractedInvoiceNumber || 'SANS-NUM';

    case 'paymentMethod':
      return file.paymentMethod ? sanitize(file.paymentMethod, 15) : 'PAY';

    case 'dueDate':
      return file.dueDate ? formatDate(file.dueDate, pattern.dateFormat) : 'NONE';

    default:
      return null;
  }
}

function formatDate(dateStr: string | null, format: string): string {
  if (!dateStr) return '000000';

  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '000000';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const shortYear = String(year).slice(-2);

    switch (format) {
      case 'YYMMDD':
        return `${shortYear}${month}${day}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'DD-MM-YYYY':
        return `${day}-${month}-${year}`;
      default:
        return `${shortYear}${month}${day}`;
    }
  } catch {
    return '000000';
  }
}

function sanitize(name: string, maxLength: number): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim()
    .substring(0, maxLength);
}

/**
 * Deduplicate file names by adding incremental suffixes
 */
export function deduplicateNames(files: InvoiceFile[], pattern: NamingPattern): InvoiceFile[] {
  const nameCount: Record<string, number> = {};

  return files.map((file) => {
    const baseName = generateFileName(file, pattern);
    const nameWithoutExt = baseName.replace(/\.pdf$/, '');

    if (nameCount[nameWithoutExt] === undefined) {
      nameCount[nameWithoutExt] = 0;
    } else {
      nameCount[nameWithoutExt]++;
    }

    const suffix = nameCount[nameWithoutExt] > 0 ? `-${nameCount[nameWithoutExt]}` : '';
    const newName = `${nameWithoutExt}${suffix}.pdf`;

    return { ...file, newName };
  });
}
