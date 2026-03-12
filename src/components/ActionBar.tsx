'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/lib/store';

export function ActionBar({
  onExportZip,
  onResetAll,
  exporting,
}: {
  onExportZip: () => void;
  onResetAll: () => void;
  exporting: boolean;
}) {
  const { files, exportGrouping, setExportGrouping } = useAppStore();
  const selectedCount = files.filter((f) => f.isSelected).length;

  if (files.length === 0) return null;

  return (
    <div className="sticky bottom-0 z-40 border-t border-white/10 bg-gray-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <span className="text-sm text-gray-400">
          {selectedCount} file{selectedCount > 1 ? 's' : ''} selected
        </span>

        <div className="flex items-center gap-2">
          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetAll}
            className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0013.803-3.7l3.181 3.182" />
            </svg>
            Reset
          </Button>

          {/* Grouping Select */}
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Group by:</span>
            <Select
              value={exportGrouping}
              onValueChange={(v) => setExportGrouping(v as any)}
            >
              <SelectTrigger className="h-8 w-28 bg-white/5 border-white/10 text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-950 border-white/10">
                <SelectItem value="none" className="text-xs">None</SelectItem>
                <SelectItem value="vendor" className="text-xs">Vendor</SelectItem>
                <SelectItem value="category" className="text-xs">Category</SelectItem>
                <SelectItem value="month" className="text-xs">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Download ZIP */}
          <Button
            onClick={onExportZip}
            disabled={selectedCount === 0 || exporting}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 disabled:opacity-50"
          >
            {exporting ? (
              <>
                <svg className="h-4 w-4 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Exporting…
              </>
            ) : (
              <>
                <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download ZIP
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
