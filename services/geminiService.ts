
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
 * (Legacy single-prompt path — kept for backward compatibility.)
 */
export async function analyzeClinicalData(
  prompt: string,
  history: ConversationTurn[] = []
): Promise<AIResult> {
  try {
    const geminiResult = await callGemini(prompt, history);
    if ('data' in geminiResult) return { data: geminiResult.data, error: null, usedFallback: false };
    console.warn('[GaucherPredict] Gemini unavailable, switching to Groq fallback.', geminiResult.error);
  } catch (rawError) {
    console.warn('[GaucherPredict] Gemini threw an error, switching to Groq fallback.', classifyError(rawError));
  }
  try {
    const groqResult = await callGroq(prompt, history);
    if ('data' in groqResult) return { data: groqResult.data, error: null, usedFallback: true };
    return { data: null, error: groqResult.error, usedFallback: true };
  } catch (rawError) {
    console.error('[GaucherPredict] Groq fallback also failed.', rawError);
    return { data: null, error: classifyError(rawError), usedFallback: true };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-stage analysis — works alongside the scoring engine
// The engine computes the numerical score; the LLM explains it clinically.
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_INSTRUCTIONS: Record<1 | 2 | 3, (score: number, extra?: string) => string> = {
  1: (score) => `You are a Gaucher Disease specialist reviewing a patient's symptom report at Kwara State University.
A rule-based scoring engine has calculated a symptom risk score of ${score}/100.
Write your response in plain, friendly English that a patient with no medical background can understand.
Explain what the score means, which symptoms are most concerning and why, and what happens next.
Avoid medical jargon where possible. When you must use a medical term, briefly explain it in plain words.
Do NOT change the score. Keep your response encouraging but honest.`,

  2: (score) => `You are a Gaucher Disease specialist reviewing a patient's blood test results.
The scoring engine calculated a lab test score of ${score}/100.
Write your response in plain, friendly English that a non-medical reader can understand.
Explain what each abnormal value might mean in simple terms (e.g. instead of "thrombocytopenia", say "a low platelet count, which affects how your blood clots").
Do NOT change the score.`,

  3: (score, typeSuspicion) =>
    `You are a Gaucher Disease specialist completing a full multi-stage assessment for a patient.
Overall risk score: ${score}/100. Suspected Gaucher type (from scoring engine): ${typeSuspicion || 'Undetermined'}.
Write a clear, plain-English summary that the patient and their assigned doctor can both read and understand.
Explain what the results mean, what type of Gaucher disease is suspected and why it matters, and give a simple, numbered list of what the patient should do next.
Use reassuring, supportive language. Avoid jargon — if a technical term is essential, explain it immediately in brackets.`,
};

/**
 * Stage-aware analysis for the multi-stage prediction workflow.
 *
 * Strategy:
 *   1. Try Gemini (requires API_KEY env var).
 *   2. If Gemini is missing, throws, or returns empty → try Groq (requires GROQ_API_KEY).
 *   3. If both fail → return classified error to the UI.
 *
 * @param stage          Which stage is being analysed (1, 2, or 3)
 * @param context        Structured clinical summary string built by the form
 * @param engineScore    Deterministic score from scoringEngine.ts
 * @param typeSuspicion  (Stage 3 only) Type suspicion from genetic scoring
 */
export async function analyzeStage(
  stage: 1 | 2 | 3,
  context: string,
  engineScore: number,
  typeSuspicion?: string
): Promise<AIResult> {
  const systemInstruction = STAGE_INSTRUCTIONS[stage](engineScore, typeSuspicion);

  // JSON schema passed to Gemini (structured output mode)
  const stageSchema = stage === 3
    ? {
        type: Type.OBJECT,
        properties: {
          reasoning:         { type: Type.STRING, description: 'Plain-English multi-stage summary for patient and doctor' },
          typeSuspicion:     { type: Type.STRING, enum: ['Type 1', 'Type 2', 'Type 3', 'Undetermined'] },
          suggestedNextSteps:{ type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['reasoning', 'typeSuspicion', 'suggestedNextSteps'],
      }
    : {
        type: Type.OBJECT,
        properties: {
          reasoning:         { type: Type.STRING, description: 'Plain-English interpretation of this stage' },
          keyFindings:       { type: Type.ARRAY, items: { type: Type.STRING } },
          suggestedNextSteps:{ type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['reasoning', 'keyFindings', 'suggestedNextSteps'],
      };

  // JSON schema description for Groq (text-based, since Groq uses json_object mode, not structured output)
  const groqSchemaDesc = stage === 3
    ? `{ "reasoning": string, "typeSuspicion": "Type 1"|"Type 2"|"Type 3"|"Undetermined", "suggestedNextSteps": string[] }`
    : `{ "reasoning": string, "keyFindings": string[], "suggestedNextSteps": string[] }`;

  // Stage 3 needs more tokens for a comprehensive final synthesis
  const maxTokens = stage === 3 ? 2048 : 1024;

  // ── 1. Try Gemini ──────────────────────────────────────────────────────────
  const geminiKey = process.env.API_KEY;
  if (geminiKey && geminiKey.trim().length > 0) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-05-20',
        contents: [{ role: 'user', parts: [{ text: context }] }],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: stageSchema,
        },
      });
      const text = response.text;
      if (text && text.trim().length > 0) {
        try {
          return { data: JSON.parse(text.trim()), error: null, usedFallback: false };
        } catch {
          console.warn('[GaucherPredict] analyzeStage: Gemini JSON parse failed, falling back to Groq.');
        }
      }
    } catch (rawError) {
      console.warn('[GaucherPredict] analyzeStage: Gemini call failed, falling back to Groq.', classifyError(rawError));
    }
  } else {
    console.info('[GaucherPredict] analyzeStage: No Gemini API key configured — going straight to Groq.');
  }

  // ── 2. Groq fallback ───────────────────────────────────────────────────────
  const groqKey = process.env.GROQ_API_KEY;
  const groqKeyMissing =
    !groqKey ||
    groqKey.trim().length === 0 ||
    groqKey === 'your_groq_api_key_here';

  if (groqKeyMissing) {
    return {
      data: null,
      error: {
        type: 'unknown',
        message:
          'Neither AI service is configured. Please add API_KEY (Gemini) or GROQ_API_KEY (Groq) to your environment variables.',
      },
      usedFallback: true,
    };
  }

  try {
    const groq = new Groq({ apiKey: groqKey, dangerouslyAllowBrowser: true });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `${systemInstruction}\n\nReturn ONLY valid JSON with no additional text or markdown. Schema: ${groqSchemaDesc}`,
        },
        { role: 'user', content: context },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: maxTokens,
    });

    const text = completion.choices[0]?.message?.content;
    if (!text || text.trim().length === 0) {
      return {
        data: null,
        error: { type: 'unknown', message: 'Groq returned an empty response. Please try again.' },
        usedFallback: true,
      };
    }

    try {
      return { data: JSON.parse(text.trim()), error: null, usedFallback: true };
    } catch {
      return {
        data: null,
        error: {
          type: 'unknown',
          message: 'The AI response could not be read correctly. Please try again.',
        },
        usedFallback: true,
      };
    }
  } catch (rawError) {
    return { data: null, error: classifyError(rawError), usedFallback: true };
  }
}
