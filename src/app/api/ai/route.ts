// ============================================================
// API Route — AI Proxy (solves CORS, supports text + vision)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, apiKey, model, prompt, images } = body;

    if (!provider || !apiKey || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let result: string;

    // images is an optional array of base64 JPEG strings
    const imageList: string[] = images || [];

    switch (provider) {
      case 'gemini':
        result = await callGemini(prompt, apiKey, model || 'gemini-2.0-flash', imageList);
        break;
      case 'openai':
        result = await callOpenAI(prompt, apiKey, model || 'gpt-4o-mini', imageList);
        break;
      case 'deepseek':
        result = await callDeepSeek(prompt, apiKey, model || 'deepseek-chat');
        break;
      default:
        return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI proxy error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---- Gemini (supports vision natively) ----
async function callGemini(prompt: string, apiKey: string, model: string, images: string[]): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Build parts: text + images
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];

  for (const img of images) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: img,
      },
    });
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 800 },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Gemini ${res.status}: ${errorBody}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ---- OpenAI (supports vision via image_url content) ----
async function callOpenAI(prompt: string, apiKey: string, model: string, images: string[]): Promise<string> {
  // Build content array: text + images
  const content: Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> = [
    { type: 'text', text: prompt },
  ];

  for (const img of images) {
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${img}`,
        detail: 'high',
      },
    });
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: images.length > 0 ? 'gpt-4o-mini' : model, // Force vision-capable model
      messages: [{ role: 'user', content }],
      temperature: 0.1,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errorBody}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ---- DeepSeek (text only, no vision support) ----
async function callDeepSeek(prompt: string, apiKey: string, model: string): Promise<string> {
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`DeepSeek ${res.status}: ${errorBody}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}
