'use client';

import { useState, useCallback } from 'react';
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

export default function HomePage() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Progress modal state
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressPhase, setProgressPhase] = useState<'extraction' | 'export'>('extraction');
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressFileName, setProgressFileName] = useState('');
  const [progressCompleted, setProgressCompleted] = useState(false);

  const { files, updateFile, categories, pattern, addBatchRecord, resetFiles, exportGrouping } = useAppStore();

  // Process files after upload: extract text, parse, generate thumbnails
  const processFiles = useCallback(async () => {
    const pendingFiles = useAppStore.getState().files.filter((f) => f.extractionStatus === 'pending');
    if (pendingFiles.length === 0) return;

    setProgressOpen(true);
    setProgressPhase('extraction');
    setProgressTotal(pendingFiles.length);
    setProgressCurrent(0);
    setProgressCompleted(false);

    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      setProgressCurrent(i + 1);
      setProgressFileName(file.originalName);
      updateFile(file.id, { extractionStatus: 'extracting' });

      try {
        // Step 1: Extract text (embedded or OCR)
        console.log(`[Extraction] Processing: ${file.originalName}`);
        const { text, ocrUsed } = await smartExtract(file.fileBlob);
        console.log(`[Extraction] Text extracted (${text.length} chars, OCR: ${ocrUsed}):`, text.substring(0, 300));

        // Step 2: Parse with regex (always, as baseline)
        const regexData = parseInvoiceData(text);
        console.log(`[Extraction] Regex parsed:`, regexData);

        // Step 3: Generate thumbnail
        let thumbnailDataUrl = '';
        try {
          thumbnailDataUrl = await generateThumbnail(file.fileBlob);
        } catch (thumbError) {
          console.warn(`[Extraction] Thumbnail failed:`, thumbError);
        }

        // Step 4: AI extraction (PRIMARY)
        // Uses VISION mode (sends page images to AI) for best accuracy
        let finalDate = regexData.date;
        let finalAmount = regexData.amount;
        let finalCurrency = regexData.currency;
        let finalVendor = regexData.vendor;
        let finalInvoiceNumber = regexData.invoiceNumber;
        let finalCategory = '';

        try {
          let aiResult;
          
          try {
            console.log(`[Extraction] Rendering PDF pages as images for vision...`);
            const pageImages = await renderPagesAsImages(file.fileBlob, 2);
            console.log(`[Extraction] Sending ${pageImages.length} image(s) to AI vision...`);
            aiResult = await aiExtractWithVision(pageImages, text, categories, pattern.defaultCurrency);
          } catch (visionError) {
            console.log(`[Extraction] Using text mode (Reason: ${visionError instanceof Error ? visionError.message : 'failed'})`);
            // Fall back to text-only AI
            if (text.length > 5) {
              aiResult = await aiExtractFields(text, categories, pattern.defaultCurrency);
            }
          }

          if (aiResult) {
            console.log(`[Extraction] AI result:`, aiResult);
            if (aiResult.date) finalDate = aiResult.date;
            if (aiResult.amount) finalAmount = aiResult.amount;
            if (aiResult.currency) finalCurrency = aiResult.currency;
            if (aiResult.vendor) finalVendor = aiResult.vendor;
            if (aiResult.category) finalCategory = aiResult.category;
            if (aiResult.invoiceNumber) finalInvoiceNumber = aiResult.invoiceNumber;
          }
        } catch (error) {
          const aiError = error as Error;
          console.warn(`[Extraction] AI failed:`, aiError.message);
          
          if (aiError.message === 'LIMIT_REACHED') {
            setUpgradeOpen(true);
            setProgressCompleted(true);
            break; // Stop processing the rest of the queue
          } else if (aiError.message === 'UNAUTHORIZED') {
            window.location.href = '/login';
            return;
          }
        }

        updateFile(file.id, {
          extractedDate: finalDate,
          extractedAmount: finalAmount,
          extractedCurrency: finalCurrency,
          extractedVendor: finalVendor,
          extractedInvoiceNumber: finalInvoiceNumber,
          category: finalCategory,
          thumbnailDataUrl,
          ocrUsed,
          extractionStatus: 'done',
        });
        console.log(`[Extraction] ✓ Done: ${file.originalName}`);
      } catch (error) {
        console.error(`[Extraction] ✗ Failed: ${file.originalName}`, error);
        updateFile(file.id, {
          extractionError: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    setProgressCompleted(true);
  }, [updateFile, categories, pattern]);

  const handleFilesAdded = useCallback(() => {
    setShowWorkspace(true);
    // Start processing after a short delay for UI to update
    setTimeout(() => processFiles(), 100);
  }, [processFiles]);

  const handleExportZip = useCallback(async () => {
    setExporting(true);
    setProgressOpen(true);
    setProgressPhase('export');
    setProgressCompleted(false);

    const selectedFiles = files.filter((f) => f.isSelected);
    setProgressTotal(selectedFiles.length);

    await createAndDownloadZip(files, (current, total, fileName) => {
      setProgressCurrent(current);
      setProgressFileName(fileName);
    }, exportGrouping);

    addBatchRecord({
      fileCount: selectedFiles.length,
      patternUsed: pattern,
      destination: 'zip',
    });

    setProgressCompleted(true);
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
              Rename your invoices
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent"> in bulk</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm sm:text-base px-6">
              Upload your PDFs, data extraction is fully automatic via our secure server-side AI processing.
            </p>

            {/* Feature badges */}
            <div className="flex flex-col items-center gap-4 mt-8">
              {/* Highlight badge */}
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-5 py-2 text-sm text-violet-300 font-medium">
                📄 Scans, receipts, and handwritten notes perfectly read by AI
              </span>

              {/* Security badges */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-gray-400 font-medium whitespace-nowrap">
                  🔒 Original files are never stored
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-gray-400 font-medium whitespace-nowrap">
                  🌐 Secure Server-Side Processing
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Naming pattern (always visible) */}
        <PatternEditor />

        {/* Drop zone (always visible) */}
        <DropZone onFilesAdded={handleFilesAdded} />

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
        open={progressOpen}
        onOpenChange={setProgressOpen}
        phase={progressPhase}
        current={progressCurrent}
        total={progressTotal}
        currentFileName={progressFileName}
        completed={progressCompleted}
        onClose={() => setProgressOpen(false)}
      />
    </div>
  );
}
