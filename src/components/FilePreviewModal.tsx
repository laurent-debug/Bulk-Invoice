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
      <DialogContent 
        className="!max-w-[75vw] w-[75vw] h-[75vh] bg-gray-950 border-white/10 p-0 overflow-hidden flex flex-col shadow-2xl"
        showCloseButton={false}
      >
        {/* Custom Header to avoid overlap */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gray-900/50 backdrop-blur-md flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-white text-base font-semibold truncate leading-tight pr-4">
              {file.originalName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                Invoice Preview
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex h-9 px-4 text-xs bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => window.open(objectUrl || '', '_blank')}
            >
              Open in New Tab
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-gray-400 hover:text-white hover:bg-white/10 rounded-full"
              onClick={() => onOpenChange(false)}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-gray-900 relative">
          {objectUrl ? (
            <div className="absolute inset-0 p-4 sm:p-8">
              <div className="w-full h-full bg-white rounded-lg overflow-hidden shadow-depth border border-white/5">
                <iframe
                  src={`${objectUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                  className="w-full h-full border-none"
                  title="PDF Preview"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
              <div className="h-8 w-8 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
              <p className="text-sm font-medium">Preparing document view...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
