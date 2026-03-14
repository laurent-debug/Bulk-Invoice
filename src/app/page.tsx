'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { DropZone } from '@/components/DropZone';
import { PatternEditor } from '@/components/PatternEditor';
import { FileTable } from '@/components/FileTable';
import { ActionBar } from '@/components/ActionBar';
import { UpgradeModal } from '@/components/UpgradeModal';
import { ProgressModal } from '@/components/ProgressModal';
import { HistoryPanel } from '@/components/HistoryPanel';
import { useAppStore } from '@/lib/store';
import { smartExtract, generateThumbnail, parseInvoiceData, renderPagesAsImages } from '@/lib/pdf-utils';
import { aiExtractFields, aiExtractWithVision } from '@/lib/ai-extract';
import { createAndDownloadZip } from '@/lib/zip-utils';
import { useTranslation } from 'react-i18next';

export default function HomePage() {
  const router = useRouter();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { t, i18n } = useTranslation();

  // Consolidated progress modal state (was 6 separate useState)
  const [progress, setProgress] = useState({
    open: false,
    phase: 'extraction' as 'extraction' | 'export',
    current: 0,
    total: 0,
    fileName: '',
    completed: false,
  });

  const { files, updateFile, categories, pattern, addBatchRecord, resetFiles, exportGrouping } = useAppStore();

  // Process files after upload: extract text, parse, generate thumbnails
  const processFiles = useCallback(async () => {
    const pendingFiles = useAppStore.getState().files.filter((f) => f.extractionStatus === 'pending');
    if (pendingFiles.length === 0) return;

    setProgress({ open: true, phase: 'extraction', current: 0, total: pendingFiles.length, fileName: '', completed: false });

    for (let i = 0; i < pendingFiles.length; i++) {
      // Read fresh from store each iteration to avoid stale closure on isPro/filesProcessed
      const { isPro, filesProcessed, incrementFilesProcessed } = useAppStore.getState();

      if (!isPro && filesProcessed >= 5) {
        setUpgradeOpen(true);
        break;
      }

      const file = pendingFiles[i];
      setProgress((p) => ({ ...p, current: i + 1, fileName: file.originalName }));
      updateFile(file.id, { extractionStatus: 'extracting' });

      try {
        // Step 2: Extract text (embedded or OCR)
        console.log(`[Extraction] Processing: ${file.originalName}`);
        const { text, ocrUsed } = await smartExtract(file.fileBlob);
        console.log(`[Extraction] Text extracted (${text.length} chars, OCR: ${ocrUsed}):`, text.substring(0, 300));

        // Step 3: Generate thumbnail
        let thumbnailDataUrl = '';
        try {
          thumbnailDataUrl = await generateThumbnail(file.fileBlob);
        } catch (thumbError) {
          console.warn(`[Extraction] Thumbnail failed:`, thumbError);
        }

        // Step 4: Hybrid extraction (Regex hints + AI validation)
        let finalDate = null;
        let finalAmount = null;
        let finalCurrency = pattern.defaultCurrency;
        let finalVendor = '';
        let finalVendorBranch: string | null = null;
        let finalInvoiceNumber = '';
        let finalCategory = '';
        let finalPaymentMethod = '';
        let finalDueDate = null;
        let finalBeneficiary: string | null = null;
        let finalPaymentReference: string | null = null;

        try {
          // 4a. Run local Regex first (fast, multi-language support)
          console.log(`[Extraction] Running Regex pre-parsing...`);
          const hints = parseInvoiceData(text);
          console.log(`[Extraction] Regex hints:`, hints);

          let aiResult;

          try {
            console.log(`[Extraction] Rendering PDF pages as images for vision...`);
            const pageImages = await renderPagesAsImages(file.fileBlob, 2);
            console.log(`[Extraction] Sending ${pageImages.length} image(s) to AI vision...`);
            // Pass the regex hints and user language to the AI
            aiResult = await aiExtractWithVision(pageImages, text, categories, pattern.defaultCurrency, i18n.language, hints);
          } catch (visionError) {
            console.log(`[Extraction] Using text mode (Reason: ${visionError instanceof Error ? visionError.message : 'failed'})`);
            // Fall back to text-only AI with hints and user language
            if (text.length > 5) {
              aiResult = await aiExtractFields(text, categories, pattern.defaultCurrency, i18n.language, hints);
            }
          }

          if (aiResult) {
            console.log(`[Extraction] AI result:`, aiResult);
            // AI takes precedence, fallback to regex hints if AI returns null/undefined for a field
            finalDate = aiResult.date ?? hints.date ?? null;
            finalAmount = aiResult.amount ?? hints.amount ?? null;
            finalCurrency = aiResult.currency ?? hints.currency;
            finalVendor = aiResult.vendor ?? hints.vendor ?? '';
            finalVendorBranch = aiResult.vendorBranch ?? null;
            finalCategory = aiResult.category ?? '';
            finalInvoiceNumber = aiResult.invoiceNumber ?? hints.invoiceNumber ?? '';
            finalPaymentMethod = aiResult.paymentMethod ?? hints.paymentMethod ?? '';
            finalDueDate = aiResult.dueDate ?? hints.dueDate ?? null;
            finalBeneficiary = aiResult.beneficiary ?? null;
            finalPaymentReference = aiResult.paymentReference ?? null;
          } else {
            // No AI result found, use regex hints as best effort
            finalDate = hints.date ?? null;
            finalAmount = hints.amount ?? null;
            finalCurrency = hints.currency;
            finalVendor = hints.vendor ?? '';
            finalInvoiceNumber = hints.invoiceNumber ?? '';
            finalPaymentMethod = hints.paymentMethod ?? '';
            finalDueDate = hints.dueDate ?? null;
          }
        } catch (error) {
          const aiError = error as Error;
          console.warn(`[Extraction] AI/Regex failed:`, aiError.message);

          if (aiError.message === 'LIMIT_REACHED') {
            setUpgradeOpen(true);
            setProgress((p) => ({ ...p, completed: true }));
            updateFile(file.id, { extractionStatus: 'pending' });
            break;
          } else if (aiError.message === 'UNAUTHORIZED') {
            router.push('/login');
            return;
          }
        }

        updateFile(file.id, {
          extractedDate: finalDate,
          extractedAmount: finalAmount,
          extractedCurrency: finalCurrency,
          extractedVendor: finalVendor,
          vendorBranch: finalVendorBranch,
          extractedInvoiceNumber: finalInvoiceNumber,
          category: finalCategory,
          paymentMethod: finalPaymentMethod,
          dueDate: finalDueDate,
          beneficiary: finalBeneficiary,
          paymentReference: finalPaymentReference,
          thumbnailDataUrl,
          ocrUsed,
          extractionStatus: 'done',
        });

        // Increment counter (re-read isPro from store to ensure it's current)
        if (!useAppStore.getState().isPro) {
          incrementFilesProcessed();
        }

        console.log(`[Extraction] ✓ Done: ${file.originalName}`);
      } catch (error) {
        console.error(`[Extraction] ✗ Failed: ${file.originalName}`, error);
        updateFile(file.id, {
          extractionError: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    setProgress((p) => ({ ...p, completed: true }));
  }, [updateFile, categories, pattern, router]);

  const handleFilesAdded = useCallback(() => {
    setShowWorkspace(true);
    // Start processing after a short delay for UI to update
    setTimeout(() => processFiles(), 100);
  }, [processFiles]);

  const handleExportZip = useCallback(async () => {
    setExporting(true);
    const selectedFiles = files.filter((f) => f.isSelected);
    setProgress({ open: true, phase: 'export', current: 0, total: selectedFiles.length, fileName: '', completed: false });

    await createAndDownloadZip(files, (current, _total, fileName) => {
      setProgress((p) => ({ ...p, current, fileName }));
    }, exportGrouping);

    addBatchRecord({
      fileCount: selectedFiles.length,
      patternUsed: pattern,
      destination: 'zip',
    });

    setProgress((p) => ({ ...p, completed: true }));
    setExporting(false);
  }, [files, pattern, addBatchRecord, exportGrouping]);

  const handleReset = useCallback(() => {
    resetFiles();
    setShowWorkspace(false);
  }, [resetFiles]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        onHistoryOpen={() => setHistoryOpen(true)}
      />

      <main className="flex-1">
        {/* Hero section when no files */}
        {!showWorkspace && (
          <div className="pt-12 pb-4 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
              {t('hero.title').split(' ').slice(0, -2).join(' ')}
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent"> {t('hero.title').split(' ').slice(-2).join(' ')}</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm sm:text-base px-6">
              {t('hero.subtitle')}
            </p>

            {/* Feature badges */}
            <div className="flex flex-col items-center gap-4 mt-8">
              {/* Highlight badge */}
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-5 py-2 text-sm text-violet-300 font-medium">
                📄 {t('feature.scans')}
              </span>

              {/* Security badges */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-gray-400 font-medium whitespace-nowrap">
                  🔒 {t('feature.nostore')}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-gray-400 font-medium whitespace-nowrap">
                  🌐 {t('feature.secure')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Naming pattern (always visible) */}
        <PatternEditor />

        {/* Drop zone (always visible) */}
        <DropZone
          onFilesAdded={handleFilesAdded}
          onLimitReached={() => setUpgradeOpen(true)}
        />

        {/* File table (visible after files added) */}
        {showWorkspace && files.length > 0 && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <FileTable />
          </div>
        )}
      </main>

      {/* Action bar */}
      {showWorkspace && (
        <ActionBar
          onExportZip={handleExportZip}
          onResetAll={handleReset}
          exporting={exporting}
        />
      )}

      {/* Modals */}
      <HistoryPanel open={historyOpen} onOpenChange={setHistoryOpen} />
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      <ProgressModal
        open={progress.open}
        onOpenChange={(open) => setProgress((p) => ({ ...p, open }))}
        phase={progress.phase}
        current={progress.current}
        total={progress.total}
        currentFileName={progress.fileName}
        completed={progress.completed}
        onClose={() => setProgress((p) => ({ ...p, open: false }))}
      />
    </div>
  );
}
