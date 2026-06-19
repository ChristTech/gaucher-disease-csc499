
import { GoogleGenAI, Type } from "@google/genai";
import Groq from "groq-sdk";

// ─── Shared types ────────────────────────────────────────────────────────────

export type AIErrorType = 'quota' | 'network' | 'unknown';

export interface AIResult {
  data: any | null;
  error: { type: AIErrorType; message: string } | null;
  /** true when Gemini failed and Groq answered instead */
  usedFallback?: boolean;
}

type ConversationTurn = { role: 'user' | 'model'; text: string };

// ─── Shared prompt / schema constants ────────────────────────────────────────

const SYSTEM_INSTRUCTION = `You are a specialized Hematologist AI assistant for Gaucher Disease screening at Kwara State University.
Your goal is to provide highly accurate risk assessments for Gaucher Disease types 1, 2, and 3.

CRITICAL INSTRUCTION FOR QUESTIONS:
If clinical data is insufficient, set "isFinal" to false.
The "questions" you ask MUST be direct follow-ups to the specific symptoms the user mentioned.
Do not ask generic Gaucher questions. If the user mentions "fatigue", ask about its duration and impact. If they mention "bone pain", ask for specific locations (e.g., "Erlenmeyer flask deformity" symptoms).
Ensure your "reasoning" explains how the user's specific input relates to Gaucher Disease pathology.

If you have high confidence (>85%), set "isFinal" to true and provide the full risk assessment.
Always maintain a professional, clinical, yet supportive tone.`;

// The JSON structure both models must return
const RESPONSE_SCHEMA_DESCRIPTION = `Return ONLY valid JSON matching this exact schema — no markdown, no extra text:
{
  "isFinal": boolean,           // true = final assessment, false = need more info
  "questions": string[],        // only when isFinal is false — targeted follow-up questions
  "riskScore": number,          // 0-100, only when isFinal is true
  "riskLevel": "High" | "Medium" | "Low",
  "reasoning": string,          // detailed clinical reasoning
  "suggestedNextSteps": string[] // clinical recommendations
}`;

// ─── Error classifier ─────────────────────────────────────────────────────────

function classifyError(error: unknown): { type: AIErrorType; message: string } {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit') ||
    lower.includes('billing') ||
    lower.includes('insufficient_quota')
  ) {
    return {
      type: 'quota',
      message:
        'The AI service has reached its usage limit. The analysis cannot be completed right now. Please try again later or contact the administrator to top up API credits.',
    };
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('econnrefused') ||
    lower.includes('etimedout') ||
    lower.includes('timeout')
  ) {
    return {
      type: 'network',
      message:
        'Could not reach the AI service. Please check your internet connection and try again.',
    };
  }

  return {
    type: 'unknown',
    message:
      'An unexpected error occurred during AI analysis. Please try again. If the problem persists, check the API key configuration.',
  };
}

// ─── Primary provider: Gemini ─────────────────────────────────────────────────

async function callGemini(
  prompt: string,
  history: ConversationTurn[]
): Promise<{ data: any } | { error: { type: AIErrorType; message: string } }> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return { error: { type: 'unknown', message: 'Gemini API key is not configured.' } };
  }

  const ai = new GoogleGenAI({ apiKey });

  const contents = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }],
  }));
  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isFinal: { type: Type.BOOLEAN, description: 'True if providing final results, false if asking questions' },
          questions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Specific, contextually relevant clarifying questions based on the user\'s previous input',
          },
          riskScore: { type: Type.NUMBER, description: 'Risk score from 0 to 100 (only if isFinal is true)' },
          riskLevel: { type: Type.STRING, enum: ['High', 'Medium', 'Low'], description: 'Risk category' },
          reasoning: { type: Type.STRING, description: 'Detailed clinical reasoning tailored to the user\'s symptoms' },
          suggestedNextSteps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Clinical recommendations like GBA1 gene sequencing or enzyme activity tests',
          },
        },
        required: ['isFinal', 'reasoning'],
      },
    },
  });

  const text = response.text;
  if (!text) {
    return { error: { type: 'unknown', message: 'Gemini returned an empty response.' } };
  }

  return { data: JSON.parse(text.trim()) };
}

// ─── Fallback provider: Groq ──────────────────────────────────────────────────

async function callGroq(
  prompt: string,
  history: ConversationTurn[]
): Promise<{ data: any } | { error: { type: AIErrorType; message: string } }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    return {
      error: {
        type: 'unknown',
        message: 'Groq fallback is not configured. Please add your GROQ_API_KEY to .env.local.',
      },
    };
  }

  const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

  // Build the message list. Groq uses OpenAI-style roles (assistant instead of model).
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: `${SYSTEM_INSTRUCTION}\n\n${RESPONSE_SCHEMA_DESCRIPTION}` },
    ...history.map(h => ({
      role: (h.role === 'model' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: h.text,
    })),
    { role: 'user', content: prompt },
  ];

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    response_format: { type: 'json_object' }, // Groq JSON mode
    temperature: 0.3, // lower = more consistent clinical output
    max_tokens: 1024,
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) {
    return { error: { type: 'unknown', message: 'Groq returned an empty response.' } };
  }

  return { data: JSON.parse(text.trim()) };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyzes clinical data for Gaucher Disease risk.
 *
 * Strategy:
 *   1. Try Gemini first.
 *   2. If Gemini throws (quota, network, or other), automatically fall back to
 *      Groq (llama-3.3-70b-versatile).
 *   3. If both fail, return the Groq error (more informative for the user).
 *
 * The caller receives the same `AIResult` shape regardless of which model answered.
 * Check `result.usedFallback` if you want to show a notice in the UI.
 */
export async function analyzeClinicalData(
  prompt: string,
  history: ConversationTurn[] = []
): Promise<AIResult> {
  // ── 1. Try Gemini ──
  try {
    const geminiResult = await callGemini(prompt, history);
    if ('data' in geminiResult) {
      return { data: geminiResult.data, error: null, usedFallback: false };
    }
    // Gemini returned a structured error (e.g. missing key) — fall through to Groq
    console.warn('[GaucherPredict] Gemini unavailable, switching to Groq fallback.', geminiResult.error);
  } catch (rawError) {
    const classified = classifyError(rawError);
    console.warn('[GaucherPredict] Gemini threw an error, switching to Groq fallback.', classified);
  }

  // ── 2. Try Groq fallback ──
  try {
    const groqResult = await callGroq(prompt, history);
    if ('data' in groqResult) {
      return { data: groqResult.data, error: null, usedFallback: true };
    }
    // Groq also returned a structured error
    return { data: null, error: groqResult.error, usedFallback: true };
  } catch (rawError) {
    console.error('[GaucherPredict] Groq fallback also failed.', rawError);
    return { data: null, error: classifyError(rawError), usedFallback: true };
  }
}
