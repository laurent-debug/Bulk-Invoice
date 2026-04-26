'use client';

import { useAppStore } from '@/lib/store';
import { useState } from 'react';

export function DebugTool() {
  const { user, isPro, filesProcessed, files, isAuthInitialized } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);

  // Only render in development mode (or toggle this if needed)
  if (process.env.NODE_ENV !== 'development') {
    // return null; // Uncomment this to hide in production
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg hover:bg-violet-500 transition-all font-mono text-xs font-bold"
        title="Debug Tool"
      >
        {isOpen ? '✕' : 'DB'}
      </button>

      {isOpen && (
        <div className="absolute bottom-12 right-0 w-80 rounded-xl border border-white/10 bg-gray-950/95 p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-2 duration-200">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2 border-b border-white/10 pb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Debug Console
          </h3>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <span className="text-gray-500">Auth Initialized: </span>
              <span className={isAuthInitialized ? 'text-emerald-400' : 'text-amber-400'}>
                {isAuthInitialized ? 'Yes' : 'No'}
              </span>
            </div>

            <div>
              <span className="text-gray-500">User: </span>
              <span className={user ? 'text-violet-400' : 'text-gray-400'}>
                {user ? user.email : 'Unauthenticated'}
              </span>
              {user && <div className="text-[10px] text-gray-600 truncate mt-0.5">{user.id}</div>}
            </div>

            <div>
              <span className="text-gray-500">Plan: </span>
              <span className={isPro ? 'text-violet-400 font-bold' : 'text-amber-400'}>
                {isPro ? 'PRO' : 'FREE'}
              </span>
            </div>

            <div>
              <span className="text-gray-500">Files Processed: </span>
              <span className="text-white">{filesProcessed}</span>
              {!isPro && <span className="text-gray-500"> / 5</span>}
            </div>

            <div>
              <span className="text-gray-500">Files in Store: </span>
              <span className="text-white">{files.length}</span>
            </div>

            {files.length > 0 && (
              <div className="border-t border-white/5 pt-2 mt-2">
                <div className="text-[10px] text-gray-600 uppercase mb-1">Recent Files</div>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {files.map((f) => (
                    <div key={f.id} className="text-[10px] truncate text-gray-400 flex items-center gap-1">
                      <span className={`h-1 w-1 rounded-full ${
                        f.extractionStatus === 'done' ? 'bg-emerald-500' : 
                        f.extractionStatus === 'extracting' ? 'bg-blue-500 animate-pulse' : 'bg-gray-500'
                      }`} />
                      {f.originalName}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-white/5 pt-2 mt-2 flex gap-2">
              <button
                onClick={() => {
                  const state = useAppStore.getState();
                  state.setAuthData(user, !isPro, filesProcessed);
                }}
                className="text-[10px] bg-white/5 hover:bg-white/10 text-gray-300 px-2 py-1 rounded border border-white/10 flex-1 text-center"
              >
                Toggle Pro
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/20 flex-1 text-center"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
