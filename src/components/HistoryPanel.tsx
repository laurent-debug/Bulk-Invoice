'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';

export function HistoryPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { history, clearHistory, applyPattern } = useAppStore();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-gray-950 border-white/10 text-white w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle className="text-white">Export History</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-gray-400 text-sm">No batches processed yet</p>
            </div>
          ) : (
            <>
              {history.map((record) => (
                <div
                  key={record.id}
                  className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {new Date(record.processedAt).toLocaleDateString('en-US', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    <Badge variant="outline" className="text-[10px] border-white/10 text-gray-400">
                      {record.destination === 'zip' ? '📦 ZIP' : '☁️ Drive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-white">
                    {record.fileCount} file{record.fileCount > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    {record.patternUsed.raw}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => applyPattern(record.patternUsed)}
                    className="text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 h-7 px-2"
                  >
                    <svg className="h-3 w-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                    </svg>
                    Reapply Pattern
                  </Button>
                </div>
              ))}

              <Button
                variant="ghost"
                onClick={clearHistory}
                className="w-full text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 mt-4"
              >
                Clear History
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
