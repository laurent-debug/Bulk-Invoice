// ============================================================
// Zustand Store — Global state management
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { InvoiceFile, NamingPattern, BatchRecord, ExportGrouping } from './types';
import { type User } from '@supabase/supabase-js';
import { DEFAULT_PATTERN, DEFAULT_CATEGORIES } from './types';
import { generateFileName, deduplicateNames } from './naming-utils';

interface AppState {
  // Auth
  user: User | null;
  isPro: boolean;
  isAuthInitialized: boolean;
  filesProcessed: number;
  setAuthData: (user: User | null, isPro: boolean, filesProcessed: number) => void;
  incrementFilesProcessed: () => void;

  // Files
  files: InvoiceFile[];
  addFiles: (files: InvoiceFile[]) => void;
  removeFile: (id: string) => void;
  updateFile: (id: string, updates: Partial<InvoiceFile>) => void;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  resetFiles: () => void;

  // Naming Pattern
  pattern: NamingPattern;
  setPattern: (pattern: Partial<NamingPattern>) => void;

  // Export Settings
  exportGrouping: ExportGrouping;
  setExportGrouping: (grouping: ExportGrouping) => void;


  categories: string[];
  setCategories: (categories: string[]) => void;
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;

  // History
  history: BatchRecord[];
  addBatchRecord: (record: Omit<BatchRecord, 'id' | 'processedAt'>) => void;
  clearHistory: () => void;
  applyPattern: (pattern: NamingPattern) => void;

  // Computed: recalculate all names
  recalculateNames: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ---- Auth ----
      user: null,
      isPro: false,
      isAuthInitialized: false,
      filesProcessed: 0,
      setAuthData: (user, isPro, filesProcessed) => set({ user, isPro, filesProcessed, isAuthInitialized: true }),
      incrementFilesProcessed: () => set((state) => ({ filesProcessed: state.filesProcessed + 1 })),

      // ---- Files ----
      files: [],

      addFiles: (newFiles) =>
        set((state) => {
          // Prevent duplicates based on file name and size combined
          const existingSignatures = new Set(
            state.files.map((f) => `${f.originalName}-${f.fileSize}`)
          );

          const filteredNewFiles = newFiles.filter(
            (nf) => !existingSignatures.has(`${nf.originalName}-${nf.fileSize}`)
          );

          if (filteredNewFiles.length === 0) return state; // Everything was a duplicate

          const updated = [...state.files, ...filteredNewFiles];
          return { files: deduplicateNames(updated, state.pattern) };
        }),

      removeFile: (id) =>
        set((state) => {
          const filtered = state.files.filter((f) => f.id !== id);
          return { files: deduplicateNames(filtered, state.pattern) };
        }),

      updateFile: (id, updates) =>
        set((state) => {
          const updated = state.files.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          );
          return { files: deduplicateNames(updated, state.pattern) };
        }),

      toggleSelection: (id) =>
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id ? { ...f, isSelected: !f.isSelected } : f
          ),
        })),

      selectAll: () =>
        set((state) => ({
          files: state.files.map((f) => ({ ...f, isSelected: true })),
        })),

      deselectAll: () =>
        set((state) => ({
          files: state.files.map((f) => ({ ...f, isSelected: false })),
        })),

      resetFiles: () => set({ files: [] }),

      // ---- Pattern ----
      pattern: DEFAULT_PATTERN,

      setPattern: (updates) =>
        set((state) => {
          const newPattern = { ...state.pattern, ...updates };
          return {
            pattern: newPattern,
            files: deduplicateNames(
              state.files.map((f) => ({
                ...f,
                newName: generateFileName(f, newPattern),
              })),
              newPattern
            ),
          };
        }),

      // ---- Export Settings ----
      exportGrouping: 'none',
      setExportGrouping: (grouping) => set({ exportGrouping: grouping }),


      // ---- Categories ----
      categories: DEFAULT_CATEGORIES,

      setCategories: (categories) => set({ categories }),

      addCategory: (category) =>
        set((state) => {
          if (state.categories.includes(category)) return state;
          return { categories: [...state.categories, category] };
        }),

      removeCategory: (category) =>
        set((state) => ({
          categories: state.categories.filter((c) => c !== category),
        })),

      // ---- History ----
      history: [],

      addBatchRecord: (record) =>
        set((state) => ({
          history: [
            { ...record, id: uuidv4(), processedAt: new Date().toISOString() },
            ...state.history,
          ].slice(0, 20), // Keep last 20
        })),

      clearHistory: () => set({ history: [] }),

      applyPattern: (pattern) => {
        const state = get();
        set({
          pattern,
          files: deduplicateNames(
            state.files.map((f) => ({
              ...f,
              newName: generateFileName(f, pattern),
            })),
            pattern
          ),
        });
      },

      // ---- Recalculate ----
      recalculateNames: () =>
        set((state) => ({
          files: deduplicateNames(state.files, state.pattern),
        })),
    }),
    {
      name: 'bulk-invoice-storage',
      partialize: (state) => ({
        pattern: state.pattern,
        categories: state.categories,
        history: state.history,
        exportGrouping: state.exportGrouping,
      }),
      // Migrate old persisted data to new format
      merge: (persisted: unknown, current: AppState) => {
        const p = persisted as Partial<AppState> & { pattern?: Record<string, unknown> };
        const merged = { ...current, ...(p || {}) };

        // Migrate old pattern format (tokens + separator → raw)
        if (merged.pattern && !merged.pattern.raw) {
          const oldPattern = p?.pattern as { tokens?: string[]; separator?: string } | undefined;
          if (oldPattern?.tokens && oldPattern?.separator) {
            merged.pattern = {
              ...merged.pattern,
              raw: oldPattern.tokens.map((t: string) => `[${t}]`).join(oldPattern.separator),
            };
          } else {
            merged.pattern = { ...merged.pattern, raw: '[date]_[amount]_[currency]_[vendor]_[category]_[invoiceNumber]' };
          }
        }

        // Ensure showCurrencyAlways exists on old configs
        if (merged.pattern && merged.pattern.showCurrencyAlways === undefined) {
          merged.pattern.showCurrencyAlways = false;
        }

        // Migrate French categories to English
        const categoryMap: Record<string, string> = {
          'Loyer': 'Rent',
          'Assurance': 'Insurance',
          'Télécom': 'Telecom',
          'Fournitures': 'Supplies',
          'Transport': 'Travel',
          'Repas': 'Meals',
          'Honoraires': 'Fees',
          'Énergie': 'Energy',
          'Autre': 'Other'
        };

        if (merged.categories) {
          merged.categories = merged.categories.map((cat: string) => categoryMap[cat] || cat);
        }

        return merged;
      },
    }
  )
);
