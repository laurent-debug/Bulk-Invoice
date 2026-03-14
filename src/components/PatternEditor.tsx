'use client';

import { useAppStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TokenType, DateFormatType } from '@/lib/types';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const TOKEN_INFO: Record<TokenType, { label: string; example: string }> = {
  date: { label: 'Date', example: '260311' },
  amount: { label: 'Amount', example: '150.00' },
  currency: { label: 'Currency', example: '(USD)' },
  vendor: { label: 'Vendor', example: 'Acme_Corp' },
  category: { label: 'Category', example: 'Supplies' },
  invoiceNumber: { label: 'Invoice N°', example: 'INV-001' },
  paymentMethod: { label: 'Payment', example: 'Visa' },
  dueDate: { label: 'Due Date', example: '260411' },
  vendorBranch: { label: 'Legal Entity', example: 'Acme-AG' },
  beneficiary: { label: 'Beneficiary', example: 'Acme-SA' },
  paymentReference: { label: 'Pay Ref', example: 'QR-123456' },
};

const ALL_TOKENS: TokenType[] = ['date', 'amount', 'currency', 'vendor', 'vendorBranch', 'category', 'invoiceNumber', 'paymentMethod', 'dueDate', 'beneficiary', 'paymentReference'];

export function PatternEditor() {
  const { t } = useTranslation();
  const { pattern, setPattern, categories, addCategory, removeCategory, exportGrouping, setExportGrouping } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState(pattern.raw || '');
  const [preview, setPreview] = useState('');
  const [newCat, setNewCat] = useState('');

  const handleAddCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCat.trim()) {
      addCategory(newCat.trim());
      setNewCat('');
    }
  };

  // Sync display value when pattern.raw changes externally
  useEffect(() => {
    setDisplayValue(pattern.raw || '');
  }, [pattern.raw]);

  // Update preview dynamically
  useEffect(() => {
    const raw = pattern.raw || '';
    let result = raw;
    
    // Dynamic date example based on format
    const dateExample = pattern.dateFormat === 'YYYY-MM-DD' ? '2026-03-11' : 
                       pattern.dateFormat === 'DD-MM-YYYY' ? '11-03-2026' : '260311';
    
    

    ALL_TOKENS.forEach((token) => {
      const regex = new RegExp(`\\[${token}\\]`, 'g');
      let example = TOKEN_INFO[token].example;
      if (token === 'date') example = dateExample;
      if (token === 'dueDate') {
         example = pattern.dateFormat === 'YYYY-MM-DD' ? '2026-04-11' : 
                   pattern.dateFormat === 'DD-MM-YYYY' ? '11-04-2026' : '260411';
      }
      result = result.replace(regex, example);
    });
    setPreview(result ? result + '.pdf' : '');
  }, [pattern.raw, pattern.dateFormat]);

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
                {t('pattern.title')}
              </h3>
              <p className="text-xs text-gray-400 max-w-lg">
                {t('pattern.desc')}
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
              aria-label={t('pattern.reset')}
            >
              {t('pattern.reset')}
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
                aria-label="File naming pattern"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-gray-500 font-mono">.pdf</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mr-2">{t('pattern.clickToAdd')}</span>
              {ALL_TOKENS.map((token) => (
                <button
                  key={token}
                  onClick={() => insertToken(token)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-violet-500/40 hover:bg-violet-500/10 text-[11px] text-gray-300 transition-all active:scale-95"
                >
                  {t(`token.${token}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Settings & Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Options */}
            <div className="flex flex-wrap items-center gap-6 p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest pl-1">{t('pattern.dateFormat')}</span>
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
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest pl-1">{t('pattern.localCurrency')}</span>
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
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="BRL">BRL</SelectItem>
                    <SelectItem value="MXN">MXN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest pl-1">{t('pattern.currencyRule')}</span>
                <Select
                  value={pattern.showCurrencyAlways ? 'always' : 'conditional'}
                  onValueChange={(v) => setPattern({ showCurrencyAlways: v === 'always' })}
                >
                  <SelectTrigger className="w-44 h-9 bg-white/5 border-white/10 text-white text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-white/10">
                    <SelectItem value="conditional">{t('pattern.hideIf', { currency: pattern.defaultCurrency })}</SelectItem>
                    <SelectItem value="always">{t('pattern.alwaysShow')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview Card */}
            <div className="relative group overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] p-5">
              <div className="absolute top-0 right-0 p-2">
                 <div className="text-[9px] font-bold text-emerald-500/50 uppercase tracking-tighter bg-emerald-500/10 px-1.5 py-0.5 rounded">{t('pattern.pdfPreview')}</div>
              </div>
              <span className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-widest block mb-3">{t('pattern.previewTitle')}</span>
              <div className="bg-black/40 rounded-lg p-4 border border-white/5 group-hover:border-emerald-500/30 transition-colors">
                <code className="text-sm sm:text-base text-emerald-400 font-mono break-all leading-relaxed">
                  {preview || 'your_invoice.pdf'}
                </code>
              </div>
              <p className="text-[10px] text-gray-500 mt-3 italic">
                {t('pattern.previewDesc')}
              </p>
            </div>
          </div>

          {/* Categories Manager */}
          <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500/50" />
                {t('category.title')}
              </h4>
              <p className="text-xs text-gray-400 mt-1">
                {t('category.desc')}
              </p>
            </div>

            <form onSubmit={handleAddCat} className="flex gap-2 max-w-sm">
              <Input
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder={t('category.new')}
                className="bg-white/5 border-white/10 text-white text-sm flex-1 h-9"
                aria-label={t('category.new')}
              />
              <Button type="submit" variant="outline" className="h-9 border-white/10 text-gray-300 hover:text-white">
                {t('category.add')}
              </Button>
            </form>

            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {categories.map((cat) => (
                  <Badge
                    key={cat}
                    className="bg-white/5 hover:bg-red-500/20 text-gray-300 border-white/10 pr-1 gap-1 group transition-all"
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() => removeCategory(cat)}
                      className="ml-1 rounded-full hover:bg-white/10 p-0.5"
                      aria-label={`Remove category ${cat}`}
                    >
                      <svg className="h-2 w-2 text-gray-500 group-hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Export Grouping Manager */}
          <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500/50" />
                ZIP Export Grouping
              </h4>
              <p className="text-xs text-gray-400 mt-1">
                Choose how your renamed files should be organized inside the downloaded ZIP archive.
              </p>
            </div>

            <div className="flex flex-col gap-2 max-w-sm">
              <Select
                value={exportGrouping}
                onValueChange={(v) => setExportGrouping(v as any)}
              >
                <SelectTrigger className="w-full h-10 bg-white/5 border-white/10 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-950 border-white/10">
                  <SelectItem value="none">Flat list (No sub-folders)</SelectItem>
                  <SelectItem value="vendor">Group by Vendor</SelectItem>
                  <SelectItem value="category">Group by Category</SelectItem>
                  <SelectItem value="month">Group by Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
