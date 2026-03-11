'use client';

import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

export function Header({
  onHistoryOpen,
  onAISetupOpen,
}: {
  onHistoryOpen: () => void;
  onAISetupOpen: () => void;
}) {
  const { aiConfig, setAIConfig } = useAppStore();

  const toggleAI = () => {
    // Only allow enabling if a key exists
    if (!aiConfig.apiKey && !aiConfig.enabled) {
      onAISetupOpen();
      return;
    }
    setAIConfig({ enabled: !aiConfig.enabled });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Bulk Invoice</h1>
            <p className="text-[10px] text-gray-400 -mt-0.5 tracking-widest uppercase">Formatting</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Main AI Toggle */}
          <div 
            onClick={toggleAI}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all ${
              aiConfig.enabled 
                ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' 
                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${aiConfig.enabled ? 'bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.8)]' : 'bg-gray-600'}`} />
            <span className="text-[11px] font-bold uppercase tracking-wider">{aiConfig.enabled ? 'IA Active' : 'IA Désactivée'}</span>
          </div>

          <div className="h-6 w-[1px] bg-white/10 mx-1 hidden sm:block" />

          {/* AI Settings */}
          <button
            onClick={onAISetupOpen}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5"
            title="Paramétrages IA & Catégories"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          </button>

          {/* History */}
          <button
            onClick={onHistoryOpen}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5"
            title="Historique des exports"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
