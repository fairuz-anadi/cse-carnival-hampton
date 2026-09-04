import { TOOLS, runTool, systemPrompt } from './agent-tools.js';

const MAX_STEPS = 8;

export function activeProvider() {
  if (process.env.GOOGLE_API_KEY) return 'gemini';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GROQ_API_KEY) return 'groq';
  return null;
}

/* ---------------- schema conversion ---------------- */

const upper = (t) => String(t).toUpperCase();

function toGeminiSchema(s) {
  if (!s || typeof s !== 'object') return s;
  const out = { ...s };
  if (out.type) out.type = upper(out.type);
  if (out.properties) {
    out.properties = Object.fromEntries(Object.entries(out.properties).map(([k, v]) => [k, toGeminiSchema(v)]));
  }
  if (out.items) out.items = toGeminiSchema(out.items);
  return out;
}

function geminiTools() {
  return [{
    functionDeclarations: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      ...(Object.keys(t.parameters.properties || {}).length ? { parameters: toGeminiSchema(t.parameters) } : {}),
    })),
  }];
}

function openaiTools() {
  return TOOLS.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

/* ---------------- Gemini ---------------- */

async function runGemini(messages) {
  const key = process.env.GOOGLE_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const trace = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt() }] },
        contents,
        tools: geminiTools(),
        generationConfig: { temperature: 0.2 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 400)}`);
    const data = await res.json();
    const cand = data.candidates?.[0];
    const parts = cand?.content?.parts || [];
    const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall);

    if (!calls.length) {
      const text = parts.map((p) => p.text).filter(Boolean).join('\n').trim();
      return { reply: text || "I could not work that one out — try rephrasing?", trace };
    }

    contents.push({ role: 'model', parts });
    const responses = [];
    for (const call of calls) {
      const result = runTool(call.name, call.args);
      trace.push({ tool: call.name, args: call.args || {}, result: summarise(result) });
      responses.push({ functionResponse: { name: call.name, response: { result: clip(result) } } });
    }
    contents.push({ role: 'user', parts: responses });
  }
  return { reply: 'That took too many steps — could you narrow the question down?', trace };
}

/* ---------------- OpenAI-compatible (OpenAI, Groq) ---------------- */

async function runOpenAICompatible(messages, { baseUrl, key, model }) {
  const convo = [{ role: 'system', content: systemPrompt() }, ...messages];
  const trace = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: convo, tools: openaiTools(), temperature: 0.2 }),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 400)}`);
    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error('Empty response from the model.');

    if (!msg.tool_calls?.length) {
      return { reply: (msg.content || '').trim() || "I could not work that one out — try rephrasing?", trace };
    }

    convo.push(msg);
    for (const call of msg.tool_calls) {
      let args = {};
      try { args = JSON.parse(call.function.arguments || '{}'); } catch {}
      const result = runTool(call.function.name, args);
      trace.push({ tool: call.function.name, args, result: summarise(result) });
      convo.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(clip(result)) });
    }
  }
  return { reply: 'That took too many steps — could you narrow the question down?', trace };
}

/* ---------------- helpers ---------------- */

function clip(result) {
  const json = JSON.stringify(result);
  if (json.length <= 12000) return result;
  return Array.isArray(result) ? result.slice(0, 25) : result;
}

function summarise(result) {
  if (Array.isArray(result)) return `${result.length} record(s)`;
  if (result && typeof result === 'object') {
    if ('ok' in result) return result.ok ? 'ok' : `refused: ${result.error}`;
    return 'object';
  }
  return String(result);
}

export async function chat(messages) {
  const provider = activeProvider();
  if (!provider) {
    const err = new Error('No LLM API key found. Add GOOGLE_API_KEY (or OPENAI_API_KEY / GROQ_API_KEY) to your .env file.');
    err.code = 'NO_KEY';
    throw err;
  }
  if (provider === 'gemini') return runGemini(messages);
  if (provider === 'openai') {
    return runOpenAICompatible(messages, {
      baseUrl: 'https://api.openai.com/v1',
      key: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    });
  }
  return runOpenAICompatible(messages, {
    baseUrl: 'https://api.groq.com/openai/v1',
    key: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  });
}
