'use client';

import { useAppStore } from '@/lib/store';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatFileSize } from '@/lib/helpers';
import { useState } from 'react';

const CURRENCIES = ['CHF', 'EUR', 'USD', 'GBP'];

export function FileTable() {
  const {
    files, toggleSelection, selectAll, deselectAll, updateFile, removeFile,
    categories, addCategory,
  } = useAppStore();

  const [newCategory, setNewCategory] = useState('');
  const selectedCount = files.filter((f) => f.isSelected).length;

  if (files.length === 0) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 mb-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        {/* Table header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">
              {files.length} file{files.length > 1 ? 's' : ''}
            </span>
            <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-300">
              {selectedCount} selected
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
            >
              Select all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={deselectAll}
            >
              Deselect
            </Button>
          </div>
        </div>

        {/* File rows */}
        <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
          {files.map((file) => (
            <div
              key={file.id}
              className={`group flex items-start gap-3 px-4 py-3 transition-colors ${
                file.isSelected ? 'bg-violet-500/5' : 'hover:bg-white/[0.02]'
              }`}
            >
              {/* Checkbox */}
              <div className="pt-1">
                <Checkbox
                  checked={file.isSelected}
                  onCheckedChange={() => toggleSelection(file.id)}
                  className="border-white/20 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                />
              </div>

              {/* Thumbnail */}
              <div className="flex-shrink-0 w-12 h-16 rounded-md bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                {file.thumbnailDataUrl ? (
                  <img src={file.thumbnailDataUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Original name and badges */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500 truncate max-w-[200px]" title={file.originalName}>
                    {file.originalName}
                  </span>
                  <span className="text-[10px] text-gray-600">{formatFileSize(file.fileSize)}</span>
                  {file.ocrUsed && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 h-4 px-1.5">OCR</Badge>
                  )}
                  {file.extractionStatus === 'extracting' && (
                    <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400 h-4 px-1.5 animate-pulse">Extracting…</Badge>
                  )}
                  {file.extractionStatus === 'error' && (
                    <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 h-4 px-1.5">Error</Badge>
                  )}
                </div>

                {/* Editable fields grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-2">
                  {/* Date */}
                  <div>
                    <label className="text-[10px] text-gray-500 mb-0.5 block">Date</label>
                    <Input
                      type="date"
                      value={file.extractedDate || ''}
                      onChange={(e) => updateFile(file.id, { extractedDate: e.target.value || null })}
                      className={`h-7 text-xs bg-white/5 border-white/10 text-white ${!file.extractedDate ? 'border-amber-500/30' : ''}`}
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-[10px] text-gray-500 mb-0.5 block">Amount</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={file.extractedAmount ?? ''}
                      onChange={(e) => updateFile(file.id, { extractedAmount: e.target.value ? parseFloat(e.target.value) : null })}
                      className={`h-7 text-xs bg-white/5 border-white/10 text-white ${file.extractedAmount === null ? 'border-amber-500/30' : ''}`}
                    />
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="text-[10px] text-gray-500 mb-0.5 block">Currency</label>
                    <Select value={(file.extractedCurrency as string) || 'CHF'} onValueChange={(v) => updateFile(file.id, { extractedCurrency: v } as any)}>
                      <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-white/10">
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c} className="text-white text-xs">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Vendor */}
                  <div>
                    <label className="text-[10px] text-gray-500 mb-0.5 block">Vendor</label>
                    <Input
                      value={file.extractedVendor || ''}
                      onChange={(e) => updateFile(file.id, { extractedVendor: e.target.value || null })}
                      placeholder="—"
                      className={`h-7 text-xs bg-white/5 border-white/10 text-white ${!file.extractedVendor ? 'border-amber-500/30' : ''}`}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-[10px] text-gray-500 mb-0.5 block">Category</label>
                    <Select value={(file.category as string) || '_none'} onValueChange={(v) => updateFile(file.id, { category: v === '_none' ? '' : v } as any)}>
                      <SelectTrigger className={`h-7 text-xs bg-white/5 border-white/10 text-white ${!file.category ? 'border-amber-500/30' : ''}`}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-white/10">
                        <SelectItem value="_none" className="text-gray-400 text-xs">— None</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c} className="text-white text-xs">{c}</SelectItem>
                        ))}
                        {/* Inline add category */}
                        <div className="px-2 py-1.5 border-t border-white/10 mt-1">
                          <div className="flex gap-1">
                            <Input
                              value={newCategory}
                              onChange={(e) => setNewCategory(e.target.value)}
                              placeholder="New…"
                              className="h-6 text-xs bg-white/5 border-white/10 text-white flex-1"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter' && newCategory.trim()) {
                                  addCategory(newCategory.trim());
                                  setNewCategory('');
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-violet-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (newCategory.trim()) {
                                  addCategory(newCategory.trim());
                                  setNewCategory('');
                                }
                              }}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Invoice Number */}
                  <div>
                    <label className="text-[10px] text-gray-500 mb-0.5 block">Invoice N°</label>
                    <Input
                      value={file.extractedInvoiceNumber || ''}
                      onChange={(e) => updateFile(file.id, { extractedInvoiceNumber: e.target.value || null })}
                      placeholder="—"
                      className={`h-7 text-xs bg-white/5 border-white/10 text-white ${!file.extractedInvoiceNumber ? 'border-amber-500/30' : ''}`}
                    />
                  </div>
                </div>

                {/* New name preview */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="h-3 w-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                    <span className="text-xs font-mono text-emerald-400 truncate">{file.newName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
