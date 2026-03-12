// ============================================================
// ZIP Utilities — Generate and download ZIP of renamed files
// ============================================================
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { InvoiceFile, ExportGrouping } from './types';

/**
 * Create a ZIP containing all selected files with their new names
 */
export async function createAndDownloadZip(
  files: InvoiceFile[],
  onProgress?: (current: number, total: number, fileName: string) => void,
  grouping: ExportGrouping = 'none'
): Promise<void> {
  const zip = new JSZip();
  const selectedFiles = files.filter((f) => f.isSelected);

  const sanitizeFolder = (name: string) => name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim() || 'Other';

  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    onProgress?.(i + 1, selectedFiles.length, file.newName);
    
    let path = '';
    
    if (grouping === 'vendor') {
      path = `${sanitizeFolder(file.extractedVendor || 'Inconnus')}/`;
    } else if (grouping === 'category') {
      path = `${sanitizeFolder(file.category || 'Sans_Categorie')}/`;
    } else if (grouping === 'month') {
      if (file.extractedDate) {
        // Date is YYYY-MM-DD, extract YYYY-MM
        const month = file.extractedDate.substring(0, 7);
        path = `${month}/`;
      } else {
        path = `Date_Inconnue/`;
      }
    }

    zip.file(`${path}${file.newName}`, file.fileBlob);
  }

  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
  );

  const timestamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `factures_${timestamp}.zip`);
}
