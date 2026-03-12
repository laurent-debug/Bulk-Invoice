'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: 'extraction' | 'export';
  current: number;
  total: number;
  currentFileName: string;
  completed: boolean;
  onClose: () => void;
}

export function ProgressModal({
  open, onOpenChange, phase, current, total, currentFileName, completed, onClose,
}: ProgressModalProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-950 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {completed
              ? '✓ Processing complete'
              : phase === 'extraction'
                ? 'Extracting data…'
                : 'Exporting…'
            }
          </DialogTitle>
        </DialogHeader>

        {!completed ? (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="w-full rounded-full bg-white/10 h-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{current} / {total}</span>
              <span className="text-gray-400">{percent}%</span>
            </div>

            {/* Current file */}
            <p className="text-xs text-gray-500 truncate">
              {phase === 'extraction' ? '🔍' : '📦'} {currentFileName}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Success summary */}
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-emerald-400 font-medium">{total} file{total > 1 ? 's' : ''} processed</p>
            </div>

            <Button
              onClick={onClose}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
