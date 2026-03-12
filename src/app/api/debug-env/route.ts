import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openai = process.env.OPENAI_API_KEY;

  return NextResponse.json({
    supabaseUrl: url ? '✅ Configuré' : '❌ MANQUANT',
    supabaseAnonKey: anonKey ? '✅ Configuré' : '❌ MANQUANT',
    supabaseServiceKey: serviceKey ? '✅ Configuré' : '❌ MANQUANT',
    openaiKey: openai ? '✅ Configuré' : '❌ MANQUANT',
    environment: process.env.NODE_ENV,
  });
}
