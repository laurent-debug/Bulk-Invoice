// ============================================================
// ZIP Utilities — Generate and download ZIP of renamed files
// ============================================================
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { InvoiceFile } from './types';

/**
 * Create a ZIP containing all selected files with their new names
 */
export async function createAndDownloadZip(
  files: InvoiceFile[],
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<void> {
  const zip = new JSZip();
  const selectedFiles = files.filter((f) => f.isSelected);

  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    onProgress?.(i + 1, selectedFiles.length, file.newName);
    zip.file(file.newName, file.fileBlob);
  }

  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
  );

  const timestamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `factures_${timestamp}.zip`);
}
