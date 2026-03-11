'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { AI_MODELS } from '@/lib/types';
import type { AIProvider } from '@/lib/types';
import { testAIConnection } from '@/lib/ai-extract';

export function AISetup({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { aiConfig, setAIConfig } = useAppStore();
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [localKey, setLocalKey] = useState(aiConfig.apiKey);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const config = { ...aiConfig, apiKey: localKey };
    const result = await testAIConnection(config);
    setTestResult(result);
    setTesting(false);
    if (result.success) {
      setAIConfig({ apiKey: localKey, enabled: true });
    }
  };



  const providers: AIProvider[] = ['gemini', 'openai', 'deepseek'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-950 border-white/10 text-white max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Paramétrages</DialogTitle>
          <DialogDescription className="text-gray-400 text-sm">
            Paramétrez l&apos;intelligence artificielle (BYOK) pour vos analyses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Settings Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-violet-400">Configuration IA</h4>
            
            {/* Provider selection */}
            <div className="grid grid-cols-1 gap-2">
              {providers.map((p) => {
                const info = AI_MODELS[p];
                const isActive = aiConfig.provider === p;
                return (
                  <button
                    key={p}
                    onClick={() => setAIConfig({ provider: p })}
                    className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
                      isActive
                        ? 'border-violet-500/50 bg-violet-500/10'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{info.name}</span>
                        {p === 'gemini' && (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] h-4">
                            ⭐ Recommandé
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{info.description}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-emerald-400">~${(info.inputCostPer1M * 0.1).toFixed(3)}</span>
                      <span className="text-[9px] text-gray-500 block">pour 100 factures</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* API Key input */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400">Clé API {AI_MODELS[aiConfig.provider].name}</label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={localKey}
                  onChange={(e) => setLocalKey(e.target.value)}
                  placeholder="Collez votre clé API ici…"
                  className="bg-white/5 border-white/10 text-white text-sm flex-1 h-9"
                />
                <Button
                  onClick={handleTest}
                  disabled={!localKey || testing}
                  className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 h-9"
                >
                  {testing ? 'Test…' : 'Tester'}
                </Button>
              </div>

              {testResult && (
                <div className={`rounded-lg px-3 py-2 text-xs ${
                  testResult.success
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}>
                  {testResult.success ? '✓ Connexion réussie ! L\'IA est activée.' : `✗ ${testResult.error}`}
                </div>
              )}
            </div>

            {/* Vision Mode Toggle */}
            <div className="flex items-center space-x-2 rounded-lg bg-white/5 border border-white/5 p-3">
              <Checkbox 
                id="vision" 
                checked={aiConfig.visionEnabled} 
                onCheckedChange={(checked) => setAIConfig({ visionEnabled: !!checked })}
                className="border-violet-500 data-[state=checked]:bg-violet-500"
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="vision"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white cursor-pointer"
                >
                  Activer le Mode Vision 👁️
                </label>
                <p className="text-xs text-gray-400">
                  L&apos;IA analyse directement l&apos;image du document. Bien plus précis pour les tickets scannés et manuscrits.
                </p>
              </div>
            </div>

            {/* Why use AI explanation box */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3 mt-6">
              <h5 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>🧠</span> Pourquoi utiliser l&apos;IA ? (vs. Standard)
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="font-bold text-gray-400 uppercase tracking-widest text-[9px] block">Traitement Local (Standard)</span>
                  <p className="text-gray-400 leading-relaxed">
                    Utilise des mots-clés et des formules strictes (Regex). <strong className="text-gray-300">Limites :</strong> Si la facture a une mise en page inhabituelle, le fournisseur ou le numéro de facture seront souvent ratés. Impossible de déduire une catégorie.
                  </p>
                </div>
                <div className="space-y-1.5 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <span className="font-bold text-violet-400 uppercase tracking-widest text-[9px] block">Traitement par l&apos;IA</span>
                  <p className="text-violet-200/70 leading-relaxed">
                    L&apos;IA « comprend » le document comme un humain. Elle identifie fiablement les <strong className="text-violet-200">fournisseurs</strong> (même complexes), gère les reçus froissés (Vision) et <strong className="text-violet-200">catégorise</strong> les dépenses logiquement.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-white/5" />


        </div>

        {/* Footer info */}
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
          <p className="text-[10px] text-gray-500 max-w-[70%]">
            🔒 Vos clés API ne sont pas persistées. Le traitement se fait pour chaque session.
          </p>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs text-gray-400 hover:text-white">
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
