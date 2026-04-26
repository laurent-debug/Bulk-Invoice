import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // 1. Auth & Usage Check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please check your login status.' }, { status: 401 });
    }

    // Get user profile constraint
    const { data: profile } = await supabase
      .from('profiles')
      .select('files_processed, is_pro')
      .eq('id', user.id)
      .single();

    // Temporarily treat all logged-in users as Pro
    // if (profile && !profile.is_pro && profile.files_processed >= 5) {
    //   return NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 403 });
    // }

    // 2. Body Parsing
    const { systemPrompt, prompt, images } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured on server' }, { status: 500 });
    }

    const imageList: string[] = images || [];

    // Build messages with system/user role separation for better instruction following
    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> }> = [];

    // System prompt (extraction rules, constant across calls)
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // User prompt (per-document context + images)
    const userContent: Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> = [
      { type: 'text', text: prompt },
    ];

    for (const img of imageList) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${img}`,
          detail: 'high',
        },
      });
    }

    messages.push({ role: 'user', content: userContent });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`OpenAI ${res.status}: ${errorBody}`);
    }

    const data = await res.json();
    const result = data.choices?.[0]?.message?.content || '';

    // 4. Increment usage counter
    if (user && !profile?.is_pro) {
      await supabase
        .from('profiles')
        .update({ files_processed: (profile?.files_processed || 0) + 1 })
        .eq('id', user.id);
    }

    return NextResponse.json({ 
      result, 
      isPro: profile?.is_pro || false,
      filesProcessed: (profile?.files_processed || 0) + (profile?.is_pro ? 0 : 1)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI extraction error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
