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
      <DialogContent className="bg-gray-950 border-white/10 text-white w-[calc(100%-2rem)] sm:max-w-md p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            {completed ? (
              <span className="text-emerald-400">✓ Processing complete</span>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                {phase === 'extraction' ? 'Extracting Data…' : 'Exporting Files…'}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {!completed ? (
          <div className="space-y-6">
            {/* Progress bar container */}
            <div className="space-y-2">
              <div className="w-full rounded-full bg-white/5 h-4 border border-white/10 p-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-medium px-0.5">
                <span className="text-gray-400">{current} of {total} processed</span>
                <span className="text-violet-400">{percent}%</span>
              </div>
            </div>

            {/* Current file */}
            <div className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/10 p-3">
              <div className="flex-shrink-0 w-8 h-8 rounded bg-violet-500/10 flex items-center justify-center text-lg">
                {phase === 'extraction' ? '🔍' : '📦'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5">
                  Current Item
                </p>
                <p className="text-sm text-gray-300 truncate font-medium">
                  {currentFileName || 'Please wait...'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Success summary */}
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 rounded-xl bg-violet-500/5 border border-violet-500/10">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-xl font-bold text-white mb-1">Success!</h4>
                <p className="text-gray-400 text-sm">
                  {total} invoice{total > 1 ? 's' : ''} {phase === 'extraction' ? 'analyzed' : 'exported'} successfully.
                </p>
              </div>
            </div>

            <Button
              onClick={onClose}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-6 shadow-xl shadow-violet-500/20 transition-all"
            >
              Continue to Workspace
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
