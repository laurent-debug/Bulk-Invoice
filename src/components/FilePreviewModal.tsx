'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { InvoiceFile } from '@/lib/types';
import { Button } from '@/components/ui/button';

export function FilePreviewModal({
  file,
  open,
  onOpenChange,
}: {
  file: InvoiceFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (file && open) {
      const url = URL.createObjectURL(file.fileBlob);
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setObjectUrl(null);
    }
  }, [file, open]);

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] h-[90vh] bg-gray-950 border-white/10 p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-4 border-b border-white/10 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-white text-sm font-medium truncate max-w-[400px]">
              Preview: {file.originalName}
            </DialogTitle>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-1">
              Document Viewer
            </p>
          </div>
          <div className="flex items-center gap-2 pr-8">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-white/5 border-white/10 text-gray-300 hover:text-white"
              onClick={() => window.open(objectUrl || '', '_blank')}
            >
              Open in New Tab
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-white/5 relative">
          {objectUrl ? (
            <iframe
              src={`${objectUrl}#toolbar=0&navpanes=0&scrollbar=0`}
              className="w-full h-full border-none"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Loading preview...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
