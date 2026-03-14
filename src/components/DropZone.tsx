'use client';

import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import { useAppStore } from '@/lib/store';
import type { InvoiceFile } from '@/lib/types';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { DEFAULT_CATEGORIES } from '@/lib/types';

const MAX_FILES = 50;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export function DropZone({ onFilesAdded, onLimitReached }: { onFilesAdded: () => void; onLimitReached: () => void }) {
  const { files, addFiles, user, isPro, filesProcessed, isAuthInitialized } = useAppStore();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!user) {
        router.push('/login');
        return;
      }

      if (!isPro && filesProcessed >= 5) {
        onLimitReached();
        return;
      }

      const remaining = MAX_FILES - files.length;
      const filesToProcess = acceptedFiles.slice(0, remaining);

      const currencyMap: Record<string, string> = { 'fr': 'EUR', 'de': 'EUR', 'en-US': 'USD', 'en-GB': 'GBP' };
      const defaultCurrency = currencyMap[i18n.language] || currencyMap[i18n.language.split('-')[0]] || 'CHF';

      const invoiceFiles: InvoiceFile[] = filesToProcess.map((file) => ({
        id: uuidv4(),
        originalName: file.name,
        fileSize: file.size,
        fileBlob: file,
        thumbnailDataUrl: '',
        ocrUsed: false,
        extractedDate: null,
        extractedAmount: null,
        extractedCurrency: defaultCurrency,
        extractedVendor: null,
        vendorBranch: null,
        extractedInvoiceNumber: null,
        category: '',
        beneficiary: null,
        paymentReference: null,
        isSelected: true,
        newName: file.name,
        extractionStatus: 'pending' as const,
        paymentMethod: null,
        dueDate: null,
        isCreditNote: false,
      }));

      addFiles(invoiceFiles);
      if (invoiceFiles.length > 0) onFilesAdded();
    },
    [files.length, addFiles, onFilesAdded, user, router, isPro, filesProcessed, onLimitReached]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES - files.length,
    disabled: files.length >= MAX_FILES || (!user), // Disable dropzone if no user
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div
        {...getRootProps({
          onClick: (e) => {
            if (!user) {
              e.preventDefault();
              e.stopPropagation();
              router.push('/login');
            }
          }
        })}
        className={`
          group relative flex min-h-[320px] cursor-pointer flex-col items-center justify-center
          rounded-2xl border-2 border-dashed transition-all duration-300 ease-out
          ${isDragActive
            ? 'border-violet-400 bg-violet-500/10 scale-[1.02] shadow-2xl shadow-violet-500/20'
            : 'border-white/20 bg-white/[0.02] hover:border-violet-400/50 hover:bg-white/[0.04] hover:shadow-xl hover:shadow-violet-500/5'
          }
          ${(files.length >= MAX_FILES) ? 'cursor-not-allowed opacity-50' : ''}
          ${!user ? 'cursor-pointer' : ''}
        `}
      >
        <input {...getInputProps()} />

        {/* Upload icon */}
        <div className={`
          mb-6 flex h-20 w-20 items-center justify-center rounded-2xl
          transition-all duration-300
          ${isDragActive
            ? 'bg-violet-500/20 scale-110'
            : 'bg-white/5 group-hover:bg-violet-500/10 group-hover:scale-105'
          }
        `}>
          <svg
            className={`h-10 w-10 transition-colors duration-300 ${isDragActive ? 'text-violet-400' : 'text-gray-400 group-hover:text-violet-400'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>

        {/* Text */}
        <div className="text-center">
          {!isAuthInitialized ? (
            <>
              <div className="h-6 w-48 bg-white/5 rounded-md mx-auto mb-2 animate-pulse" />
              <div className="h-10 w-32 bg-white/5 rounded-lg mx-auto mt-2 animate-pulse" />
            </>
          ) : !user ? (
            <>
              <p className="text-xl font-bold text-white mb-2">
                {t('hero.title')}
              </p>
              <button 
                className="mt-2 rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 hover:bg-violet-500 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push('/login');
                }}
              >
                {t('common.signin')}
              </button>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-white mb-2">
                {isDragActive ? t('dropzone.drop') : t('dropzone.drag')}
              </p>
              <p className="text-gray-400">
                {t('dropzone.browse')}
              </p>
              {(!mounted || !isAuthInitialized) ? (
                <div className="mt-3 inline-flex items-center rounded-full bg-transparent px-3 py-1 text-sm font-medium text-transparent">
                  Loading...
                </div>
              ) : !isPro ? (
                <div className="mt-3 inline-flex items-center rounded-full bg-violet-500/10 px-3 py-1 text-sm font-medium text-violet-300 border border-violet-500/20">
                  {t('dropzone.trial', { used: filesProcessed })}
                </div>
              ) : (
                <div className="mt-3 inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold tracking-widest uppercase text-emerald-400 border border-emerald-500/20">
                  Pro Account Active
                </div>
              )}
            </>
          )}
        </div>

        {/* Constraints */}
        <div className="mt-8 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            PDF only
          </span>
          <span>•</span>
          <span>Max {MAX_FILES} files</span>
          <span>•</span>
          <span>Max 20 MB/file</span>
        </div>

        {/* File count indicator */}
        {files.length > 0 && (
          <div className="mt-4 rounded-full bg-violet-500/20 px-3 py-1 text-xs text-violet-300">
            {files.length} file{files.length > 1 ? 's' : ''} uploaded
          </div>
        )}

        {/* Rejection errors */}
        {fileRejections.length > 0 && (
          <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400">
            {fileRejections.map((rejection, i) => (
              <p key={i}>
                {rejection.file.name}: {rejection.errors.map(e => e.message).join(', ')}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
