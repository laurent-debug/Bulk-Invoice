'use client';

import { useAppStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TokenType, DateFormatType } from '@/lib/types';
import { useState, useRef, useEffect, useCallback } from 'react';

const TOKEN_INFO: Record<TokenType, { label: string; example: string }> = {
  date: { label: 'Date', example: '260311' },
  amount: { label: 'Montant', example: '150.00' },
  currency: { label: 'Devise', example: '(EUR)' },
  vendor: { label: 'Fournisseur', example: 'Migros' },
  category: { label: 'Catégorie', example: 'Fournitures' },
  invoiceNumber: { label: 'N° Facture', example: 'F2024-001' },
};

const ALL_TOKENS: TokenType[] = ['date', 'amount', 'currency', 'vendor', 'category', 'invoiceNumber'];

export function PatternEditor() {
  const { pattern, setPattern } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState(pattern.raw || '');
  const [preview, setPreview] = useState('');

  // Sync display value when pattern.raw changes externally
  useEffect(() => {
    setDisplayValue(pattern.raw || '');
  }, [pattern.raw]);

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

  const insertToken = (token: TokenType) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? displayValue.length;
    const end = input?.selectionEnd ?? displayValue.length;
    const newText = displayValue.substring(0, start) + `[${token}]` + displayValue.substring(end);
    setDisplayValue(newText);
    setPattern({ raw: newText });
    
    setTimeout(() => {
      if (input) {
        input.focus();
        const pos = start + token.length + 2;
        input.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 mb-8">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        {/* Header Section */}
        <div className="bg-white/[0.02] border-b border-white/10 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                Format de nommage des fichiers
              </h3>
              <p className="text-xs text-gray-400 max-w-lg">
                Personnalisez le nom final de vos factures. Tapez librement vos séparateurs (tirets, points, espaces) dans le champ ci-dessous.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 text-gray-400 hover:text-white text-xs h-8"
              onClick={() => {
                const defaultRaw = '[date]_[amount]_[currency]_[vendor]_[category]_[invoiceNumber]';
                setPattern({ raw: defaultRaw });
              }}
            >
              Réinitialiser par défaut
            </Button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Main Input Area */}
          <div className="space-y-3">
            <div className="relative group">
              <input
                ref={inputRef}
                value={displayValue}
                onChange={(e) => setPattern({ raw: e.target.value })}
                placeholder="Ex: [date]-[vendor]-[amount].pdf"
                className="w-full bg-black/20 border border-white/10 rounded-xl text-white font-mono text-base h-16 px-5 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all placeholder:text-gray-700"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-gray-500 font-mono">.pdf</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mr-2">Cliquer pour ajouter :</span>
              {ALL_TOKENS.map((token) => (
                <button
                  key={token}
                  onClick={() => insertToken(token)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-violet-500/40 hover:bg-violet-500/10 text-[11px] text-gray-300 transition-all active:scale-95"
                >
                  {TOKEN_INFO[token].label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Settings & Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Options */}
            <div className="flex flex-wrap items-center gap-6 p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest pl-1">Format Date</span>
                <Select
                  value={(pattern.dateFormat as string) || 'YYMMDD'}
                  onValueChange={(v) => setPattern({ dateFormat: (v || 'YYMMDD') as DateFormatType })}
                >
                  <SelectTrigger className="w-36 h-9 bg-white/5 border-white/10 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-white/10">
                    <SelectItem value="YYMMDD">YYMMDD</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest pl-1">Devise Locale</span>
                <Select
                  value={(pattern.defaultCurrency as string) || 'CHF'}
                  onValueChange={(v) => setPattern({ defaultCurrency: v || 'CHF' })}
                >
                  <SelectTrigger className="w-24 h-9 bg-white/5 border-white/10 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-white/10">
                    <SelectItem value="CHF">CHF</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest pl-1">Règle Devise</span>
                <Select
                  value={pattern.showCurrencyAlways ? 'always' : 'conditional'}
                  onValueChange={(v) => setPattern({ showCurrencyAlways: v === 'always' })}
                >
                  <SelectTrigger className="w-44 h-9 bg-white/5 border-white/10 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-white/10">
                    <SelectItem value="conditional">Masquer si {pattern.defaultCurrency}</SelectItem>
                    <SelectItem value="always">Toujours afficher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview Card */}
            <div className="relative group overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] p-5">
              <div className="absolute top-0 right-0 p-2">
                 <div className="text-[9px] font-bold text-emerald-500/50 uppercase tracking-tighter bg-emerald-500/10 px-1.5 py-0.5 rounded">PDF Preview</div>
              </div>
              <span className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-widest block mb-3">Exemple de nom généré :</span>
              <div className="bg-black/40 rounded-lg p-4 border border-white/5 group-hover:border-emerald-500/30 transition-colors">
                <code className="text-sm sm:text-base text-emerald-400 font-mono break-all leading-relaxed">
                  {preview || 'votre_facture.pdf'}
                </code>
              </div>
              <p className="text-[10px] text-gray-500 mt-3 italic">
                Ceci est un aperçu avec des données fictives. Vos vraies factures seront renommées selon ce schéma.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
