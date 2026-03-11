'use client';

import { useAppStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TokenType, DateFormatType } from '@/lib/types';
import { useState, useRef, useEffect, useCallback } from 'react';

const TOKEN_INFO: Record<TokenType, { label: string; example: string; aliases: string[] }> = {
  date: { label: 'Date', example: '260311', aliases: ['date', 'dat', 'jour', 'day', 'yymmdd', 'yyyy-mm-dd', 'dd-mm-yyyy'] },
  amount: { label: 'Montant', example: '150.00', aliases: ['montant', 'amount', 'total', 'prix', 'price', 'ttc', 'somme', 'xxx.xx'] },
  currency: { label: 'Devise', example: '(EUR)', aliases: ['devise', 'currency', 'monnaie', 'chf', 'eur', 'usd'] },
  vendor: { label: 'Fournisseur', example: 'Migros', aliases: ['fournisseur', 'vendor', 'magasin', 'destinataire', 'enseigne', 'societe', 'société'] },
  category: { label: 'Catégorie', example: 'Fournitures', aliases: ['categorie', 'catégorie', 'category', 'cat', 'type'] },
  invoiceNumber: { label: 'N° Facture', example: 'F2024-001', aliases: ['facture', 'invoice', 'numero', 'numéro', 'num', 'no', 'no-facture', 'ref', 'référence', 'reference'] },
};

const ALL_TOKENS: TokenType[] = ['date', 'amount', 'currency', 'vendor', 'category', 'invoiceNumber'];

/**
 * Auto-detect tokens from natural language input
 * e.g. "date_montant_fournisseur" → "[date]_[amount]_[vendor]"
 */
function autoDetectPattern(input: string): string {
  let result = input;

  // Remove .pdf extension if user pasted a full filename
  result = result.replace(/\.pdf$/i, '');

  // Already uses bracket notation? Return as-is
  if (/\[.+?\]/.test(input)) return input;

  // 1. Concrete Pattern Detection (e.g. "260311", "150.00", "CHF")
  // Date: 6 digits (YYMMDD) or standard dates
  result = result.replace(/(?<=^|[_ \.-])(?:20\d{2}[-\.]\d{2}[-\.]\d{2}|\d{2}[-\.]\d{2}[-\.]20\d{2}|\d{6})(?=$|[_ \.-])/g, '[date]');
  
  // Amount: number with exactly 2 decimal places (e.g. 150.00, 4.50)
  result = result.replace(/(?<=^|[_ \.-])\d+[\.,]\d{2}(?=$|[_ \.-])/g, '[amount]');
  
  // Currency: CHF, EUR, USD, etc.
  result = result.replace(/(?<=^|[_ \.-])(CHF|EUR|USD|GBP)(?=$|[_ \.-])/gi, '[currency]');

  // Invoice Number: F2024-001, INV-..., etc.
  result = result.replace(/(?<=^|[_ \.-])(?:(F|INV|FAC|RE)-?\d{4,}-?[a-zA-Z0-9]*)(?=$|[_ \.-])/gi, '[invoiceNumber]');

  // 2. Natural Language Detection (e.g. "date_montant")
  for (const token of ALL_TOKENS) {
    const { aliases } = TOKEN_INFO[token];
    for (const alias of aliases) {
      // Match whole "word" between separators
      const regex = new RegExp(`(?<=^|[_\\-\\. ])${alias}(?=$|[_\\-\\. ])`, 'gi');
      if (regex.test(result)) {
        result = result.replace(regex, `[${token}]`);
      }
    }
  }

  return result;
}

export function PatternEditor() {
  const { pattern, setPattern } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState(pattern.raw || '');
  const [preview, setPreview] = useState('');
  const [isNaturalMode, setIsNaturalMode] = useState(false);

  // Sync display value when pattern.raw changes externally
  useEffect(() => {
    if (!isNaturalMode) {
      setDisplayValue(pattern.raw || '');
    }
  }, [pattern.raw, isNaturalMode]);

  // Update preview dynamically
  useEffect(() => {
    const raw = pattern.raw || '';
    let result = raw;
    ALL_TOKENS.forEach((token) => {
      const regex = new RegExp(`\\[${token}\\]`, 'g');
      result = result.replace(regex, TOKEN_INFO[token].example);
    });
    setPreview(result ? result + '.pdf' : '');
  }, [pattern.raw]);

  const handleInputChange = useCallback((value: string) => {
    setDisplayValue(value);

    // Auto-detect if user is typing natural language (no brackets)
    if (!/\[/.test(value)) {
      setIsNaturalMode(true);
      const detected = autoDetectPattern(value);
      setPattern({ raw: detected });
    } else {
      setIsNaturalMode(false);
      setPattern({ raw: value });
    }
  }, [setPattern]);

  const handleBlur = useCallback(() => {
    // On blur, convert display to the detected pattern
    if (isNaturalMode) {
      setDisplayValue(pattern.raw || '');
      setIsNaturalMode(false);
    }
  }, [isNaturalMode, pattern.raw]);

  const insertToken = (token: TokenType) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? displayValue.length;
    const end = input?.selectionEnd ?? displayValue.length;
    const newText = displayValue.substring(0, start) + `[${token}]` + displayValue.substring(end);
    setDisplayValue(newText);
    setPattern({ raw: newText });
    setIsNaturalMode(false);
    
    setTimeout(() => {
      if (input) {
        input.focus();
        const pos = start + token.length + 2;
        input.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 mb-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            <h3 className="text-sm font-semibold text-white">Format de nommage</h3>
          </div>
        </div>

        {/* Main input */}
        <div className="relative mb-3">
          <input
            ref={inputRef}
            value={displayValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleBlur}
            placeholder="Collez un exemple (ex: 260311_150.00_Apple) ou votre format"
            className="w-full bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm h-12 px-4 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 placeholder:text-gray-500 placeholder:font-sans"
          />
        </div>

        {/* Help text + token badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <span className="text-[10px] text-gray-400 mr-1 italic">Astuce : Sélectionnez un mot ("Apple") et cliquez sur un bouton →</span>
          {ALL_TOKENS.map((token) => (
            <Badge
              key={token}
              variant="outline"
              className="cursor-pointer select-none transition-all text-[10px] bg-white/[0.03] border-white/5 hover:border-violet-500/50 hover:bg-violet-500/10 text-gray-400 hover:text-violet-300 py-0.5 px-1.5"
              onClick={() => insertToken(token)}
            >
              {TOKEN_INFO[token].label}
            </Badge>
          ))}
        </div>

        {/* Options row + Preview */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          {/* Settings */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500">Date</span>
              <Select
                value={pattern.dateFormat ?? undefined}
                onValueChange={(v) => setPattern({ dateFormat: v as DateFormatType })}
              >
                <SelectTrigger className="w-28 h-7 text-[11px] bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  <SelectItem value="YYMMDD" className="text-white text-xs">YYMMDD</SelectItem>
                  <SelectItem value="YYYY-MM-DD" className="text-white text-xs">YYYY-MM-DD</SelectItem>
                  <SelectItem value="DD-MM-YYYY" className="text-white text-xs">DD-MM-YYYY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500">Devise</span>
              <Select
                value={pattern.defaultCurrency ?? undefined}
                onValueChange={(v) => setPattern({ defaultCurrency: v })}
              >
                <SelectTrigger className="w-16 h-7 text-[11px] bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  <SelectItem value="CHF" className="text-white text-xs">CHF</SelectItem>
                  <SelectItem value="EUR" className="text-white text-xs">EUR</SelectItem>
                  <SelectItem value="USD" className="text-white text-xs">USD</SelectItem>
                  <SelectItem value="GBP" className="text-white text-xs">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="flex-1 rounded-lg bg-emerald-500/5 border border-emerald-500/15 px-3 py-2 flex items-center gap-2 min-w-0">
              <span className="text-[9px] text-emerald-500/60 font-bold uppercase tracking-widest whitespace-nowrap">Aperçu</span>
              <span className="text-[10px] text-gray-600">→</span>
              <p className="text-xs text-emerald-400 font-mono truncate">{preview}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
