
import React, { useState } from 'react';
import {
  Loader2, BrainCircuit, ChevronRight, RefreshCcw, WifiOff,
  CreditCard, AlertTriangle, RotateCcw, Check, Dna,
  FlaskConical, Stethoscope, Activity, ChevronDown,
} from 'lucide-react';
import { analyzeStage, AIErrorType } from '../services/geminiService';
import {
  calculateStage1Score, calculateStage2Score, calculateStage3Score,
  calculateCompositeScore, scoreToRiskLevel, getConfidenceLabel,
  STAGE_2_UNLOCK_THRESHOLD, STAGE_3_UNLOCK_THRESHOLD,
} from '../services/scoringEngine';
import {
  User, Prediction, RiskLevel, GaucherSymptoms, BiochemicalInputs,
  GeneticInputs, GaucherTypeSuspicion, EthnicBackground, GBA1Mutation,
} from '../types';
import { INITIAL_DOCTORS } from '../constants';

// ── Props ─────────────────────────────────────────────────────────────────────

interface NewPredictionFormProps {
  currentUser: User | null;
  onSavePrediction: (prediction: Prediction) => void;
}

// ── Initial state helpers ─────────────────────────────────────────────────────

const emptySymptoms = (): GaucherSymptoms => ({
  splenomegaly: false, hepatomegaly: false, bonePain: false,
  fatigue: false, easyBruising: false, anaemia: false,
  thrombocytopenia: false, neurologicalSymptoms: false,
  onsetAge: '', duration: '',
});

const emptyBiochemical = (): { bge: string; plt: string; hb: string; chito: string } => ({
  bge: '', plt: '', hb: '', chito: '',
});

const emptyGenetic = (): { m1: GBA1Mutation; m2: GBA1Mutation; neuro: boolean } => ({
  m1: 'Unknown / Not tested', m2: 'Unknown / Not tested', neuro: false,
});

// ── View type ─────────────────────────────────────────────────────────────────

type View = 's1form' | 's1result' | 's2form' | 's2result' | 's3form' | 'final';

// ── Reusable sub-components ───────────────────────────────────────────────────

const STEP_LABELS: Record<1|2|3, string> = { 1: 'Symptoms', 2: 'Lab Tests', 3: 'Genetics' };

/** Stage progress stepper */
const Stepper = ({ active, done }: { active: 1 | 2 | 3; done: number[] }) => (
  <div className="flex items-center justify-center gap-0 mb-8">
    {([1, 2, 3] as const).map((s, i) => {
      const isDone = done.includes(s);
      const isCurrent = s === active;
      return (
        <React.Fragment key={s}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
              isDone ? 'bg-cyan-500 text-white' :
              isCurrent ? 'bg-slate-900 text-white scale-110 ring-4 ring-slate-100' :
              'bg-slate-100 text-slate-400'
            }`}>
              {isDone ? <Check className="w-4 h-4" /> : s}
            </div>
            <span className={`text-[9px] font-bold hidden md:block ${isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>{STEP_LABELS[s]}</span>
          </div>
          {i < 2 && (
            <div className={`h-0.5 w-10 mb-4 transition-all duration-500 ${isDone ? 'bg-cyan-500' : 'bg-slate-100'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

/** Score ring card shown after each stage */
const StageScoreCard = ({
  stage, score, label,
}: { stage: number; score: number; label: string }) => {
  const color = score >= 65 ? 'text-rose-600' : score >= 30 ? 'text-amber-500' : 'text-emerald-600';
  const bg = score >= 65 ? 'bg-rose-50 border-rose-200' : score >= 30 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200';
  return (
    <div className={`${bg} border rounded-2xl p-5 flex items-center gap-5`}>
      <div className="shrink-0">
        <div className={`text-5xl font-black ${color}`}>{score}</div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">/ 100</div>
      </div>
      <div>
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Stage {stage} Score</div>
        <div className="font-black text-slate-900">{label}</div>
      </div>
    </div>
  );
};

/** Symptom checkbox toggle */
const SymptomToggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left w-full transition-all ${
      checked ? 'border-cyan-500 bg-cyan-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'
    }`}
  >
    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
      checked ? 'border-cyan-500 bg-cyan-500' : 'border-slate-300'
    }`}>
      {checked && <Check className="w-3 h-3 text-white" />}
    </div>
    <span className={`text-sm font-semibold ${checked ? 'text-cyan-800' : 'text-slate-600'}`}>{label}</span>
  </button>
);

/** Shared input styles */
const inputCls = 'w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-bold text-slate-700 text-sm';
const selectCls = inputCls + ' bg-white';
const labelCls = 'text-[10px] font-black text-slate-400 uppercase tracking-widest';
const fieldCls = 'space-y-1.5';

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const NewPredictionForm: React.FC<NewPredictionFormProps> = ({ currentUser, onSavePrediction }) => {
  // ── Core state ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<View>('s1form');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [aiError, setAiError] = useState<{ type: AIErrorType; message: string } | null>(null);
  const [lastRetry, setLastRetry] = useState<(() => void) | null>(null);

  // ── Stage 1 state ───────────────────────────────────────────────────────────
  const [name, setName] = useState(currentUser?.name || '');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [ethnicity, setEthnicity] = useState<EthnicBackground | ''>('');
  const [familyHistory, setFamilyHistory] = useState(false);
  const [symptoms, setSymptoms] = useState<GaucherSymptoms>(emptySymptoms());
  const [additionalContext, setAdditionalContext] = useState('');
  const [s1Result, setS1Result] = useState<{ score: number; reasoning: string; keyFindings: string[]; suggestedNextSteps: string[] } | null>(null);

  // ── Stage 2 state ───────────────────────────────────────────────────────────
  const [bioForm, setBioForm] = useState(emptyBiochemical());
  const [s2Result, setS2Result] = useState<{ score: number; reasoning: string; keyFindings: string[]; suggestedNextSteps: string[] } | null>(null);

  // ── Stage 3 / Final state ───────────────────────────────────────────────────
  const [genForm, setGenForm] = useState(emptyGenetic());
  const [finalData, setFinalData] = useState<{
    composite: number; riskLevel: RiskLevel; typeSuspicion: GaucherTypeSuspicion;
    reasoning: string; suggestedNextSteps: string[]; stagesDone: (1 | 2 | 3)[];
    s1: number; s2: number | null; s3: number | null;
    assignedDoctor: User;
  } | null>(null);

  // ── Which stages have been scored ──────────────────────────────────────────
  const stagesDone: (1 | 2 | 3)[] = [
    ...(s1Result ? [1 as const] : []),
    ...(s2Result ? [2 as const] : []),
  ];

  // ── Error banner ────────────────────────────────────────────────────────────
  const ErrorBanner = () => {
    if (!aiError) return null;
    const cfg = {
      quota: { icon: <CreditCard className="w-5 h-5 text-amber-600" />, title: 'API Quota Reached', bg: 'bg-amber-50 border-amber-200', tc: 'text-amber-800' },
      network: { icon: <WifiOff className="w-5 h-5 text-blue-600" />, title: 'No Connection', bg: 'bg-blue-50 border-blue-200', tc: 'text-blue-800' },
      unknown: { icon: <AlertTriangle className="w-5 h-5 text-rose-600" />, title: 'Analysis Failed', bg: 'bg-rose-50 border-rose-200', tc: 'text-rose-800' },
    }[aiError.type];
    return (
      <div className={`${cfg.bg} border rounded-2xl p-4 flex gap-4 items-start animate-in slide-in-from-top duration-300 mb-4`}>
        <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center shrink-0">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <p className={`font-black text-sm ${cfg.tc} mb-0.5`}>{cfg.title}</p>
          <p className="text-xs text-slate-600 leading-relaxed">{aiError.message}</p>
        </div>
        {lastRetry && (
          <button onClick={lastRetry} disabled={isAnalyzing}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all disabled:opacity-50 shadow-sm">
            <RotateCcw className="w-3.5 h-3.5" /> Retry
          </button>
        )}
      </div>
    );
  };


  // ── Helpers ─────────────────────────────────────────────────────────────────
  const sym = (k: keyof GaucherSymptoms, v: boolean) =>
    setSymptoms(p => ({ ...p, [k]: v }));

  const resetAll = () => {
    setView('s1form'); setIsAnalyzing(false); setUsedFallback(false); setAiError(null);
    setLastRetry(null); setName(currentUser?.name || ''); setAge(''); setSex('');
    setEthnicity(''); setFamilyHistory(false); setSymptoms(emptySymptoms());
    setAdditionalContext(''); setS1Result(null); setBioForm(emptyBiochemical());
    setS2Result(null); setGenForm(emptyGenetic()); setFinalData(null);
  };

  const savePrediction = (
    composite: number, riskLvl: RiskLevel, typeSusp: GaucherTypeSuspicion,
    reasoning: string, nextSteps: string[], done: (1|2|3)[], s1: number, s2: number|null, s3: number|null
  ): User => {
    const doctor = INITIAL_DOCTORS[Math.floor(Math.random() * INITIAL_DOCTORS.length)];
    const bio: BiochemicalInputs | undefined = s2Result ? {
      betaGlucocerebrosidase: bioForm.bge ? parseFloat(bioForm.bge) : undefined,
      plateletCount: bioForm.plt ? parseFloat(bioForm.plt) : undefined,
      hemoglobin: bioForm.hb ? parseFloat(bioForm.hb) : undefined,
      chitotriosidase: bioForm.chito ? parseFloat(bioForm.chito) : undefined,
    } : undefined;
    const gen: GeneticInputs | undefined = done.includes(3) ? {
      mutation1: genForm.m1, mutation2: genForm.m2, neurologicalConfirmed: genForm.neuro,
    } : undefined;
    const p: Prediction = {
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser?.id || 'anonymous',
      patientName: name, patientAge: age, patientSex: sex,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Pending Review',
      riskLevel: riskLvl, riskScore: composite,
      reasoning, suggestedNextSteps: nextSteps,
      reviewingDoctorId: doctor.id,
      ethnicBackground: ethnicity || undefined,
      familyHistory,
      symptoms,
      biochemical: bio,
      genetic: gen,
      stageScores: { stage1: s1, stage2: s2, stage3: s3, composite },
      typeSuspicion: typeSusp,
      completedStages: done,
      additionalContext: additionalContext || undefined,
    };
    onSavePrediction(p);
    return doctor;
  };

  // ── Stage 1 submit ──────────────────────────────────────────────────────────
  const runStage1 = async () => {
    setIsAnalyzing(true); setAiError(null);
    const { score, breakdown } = calculateStage1Score({ symptoms, familyHistory, ethnicBackground: ethnicity });
    const context = `
Patient: ${name}, Age: ${age}, Sex: ${sex}
Ethnic Background: ${ethnicity || 'Not specified'}
Family History of Gaucher Disease: ${familyHistory ? 'Yes' : 'No'}
Symptoms present: ${[
  symptoms.splenomegaly && 'Splenomegaly', symptoms.hepatomegaly && 'Hepatomegaly',
  symptoms.bonePain && 'Bone pain', symptoms.thrombocytopenia && 'Known thrombocytopenia',
  symptoms.anaemia && 'Anaemia', symptoms.easyBruising && 'Easy bruising',
  symptoms.fatigue && 'Fatigue', symptoms.neurologicalSymptoms && 'Neurological symptoms',
].filter(Boolean).join(', ') || 'None reported'}
Age of symptom onset: ${symptoms.onsetAge || 'Not specified'}
Symptom duration: ${symptoms.duration || 'Not specified'}
Additional context: ${additionalContext || 'None provided'}

Scoring engine result: ${score}/100
Score contributions:
${breakdown.map(b => `  - ${b}`).join('\n')}
`.trim();

    const fn = async () => {
      const { data, error, usedFallback: fb } = await analyzeStage(1, context, score);
      if (error) { setAiError(error); setIsAnalyzing(false); return; }
      setUsedFallback(!!fb);
      setS1Result({ score, reasoning: data.reasoning, keyFindings: data.keyFindings || [], suggestedNextSteps: data.suggestedNextSteps || [] });
      setView('s1result');
      setIsAnalyzing(false);
    };
    setLastRetry(() => fn);
    await fn();
  };

  // ── Stage 2 submit ──────────────────────────────────────────────────────────
  const runStage2 = async () => {
    setIsAnalyzing(true); setAiError(null);
    const bio: BiochemicalInputs = {
      betaGlucocerebrosidase: bioForm.bge ? parseFloat(bioForm.bge) : undefined,
      plateletCount: bioForm.plt ? parseFloat(bioForm.plt) : undefined,
      hemoglobin: bioForm.hb ? parseFloat(bioForm.hb) : undefined,
      chitotriosidase: bioForm.chito ? parseFloat(bioForm.chito) : undefined,
    };
    const { score, breakdown } = calculateStage2Score({ biochemical: bio, patientSex: sex });
    const context = `
Stage 1 Triage Score: ${s1Result?.score}/100
Stage 2 Biochemical Results:
  β-Glucocerebrosidase: ${bioForm.bge || 'Not provided'} nmol/hr/mg (normal 25–100)
  Platelet count: ${bioForm.plt || 'Not provided'} ×10⁹/L (normal ≥ 150)
  Hemoglobin: ${bioForm.hb || 'Not provided'} g/dL (normal: M ≥13, F ≥12)
  Chitotriosidase: ${bioForm.chito || 'Not provided'} nmol/hr/mL (normal < 25)

Scoring engine result: ${score}/100
Score contributions:
${breakdown.map(b => `  - ${b}`).join('\n')}
`.trim();

    const fn = async () => {
      const { data, error, usedFallback: fb } = await analyzeStage(2, context, score);
      if (error) { setAiError(error); setIsAnalyzing(false); return; }
      setUsedFallback(!!fb);
      setS2Result({ score, reasoning: data.reasoning, keyFindings: data.keyFindings || [], suggestedNextSteps: data.suggestedNextSteps || [] });
      setView('s2result');
      setIsAnalyzing(false);
    };
    setLastRetry(() => fn);
    await fn();
  };

  // ── Final stage (Stage 3 or early finish) ──────────────────────────────────
  const runFinal = async (skipS3 = false) => {
    setIsAnalyzing(true); setAiError(null);
    const s1 = s1Result?.score ?? 0;
    const s2 = s2Result?.score ?? null;
    let s3: number | null = null;
    let typeSusp: GaucherTypeSuspicion = 'Undetermined';
    let s3Breakdown: string[] = [];

    if (!skipS3) {
      const gen: GeneticInputs = { mutation1: genForm.m1, mutation2: genForm.m2, neurologicalConfirmed: genForm.neuro };
      const r3 = calculateStage3Score({ genetic: gen });
      s3 = r3.score; typeSusp = r3.typeSuspicion; s3Breakdown = r3.breakdown;
    }

    const composite = calculateCompositeScore(s1, s2, s3);
    const riskLvl = scoreToRiskLevel(composite);
    const done: (1|2|3)[] = [1, ...(s2 !== null ? [2 as const] : []), ...(!skipS3 ? [3 as const] : [])];
    const confidence = getConfidenceLabel(done);

    const context = `
MULTI-STAGE GAUCHER ASSESSMENT SUMMARY
Patient: ${name}, Age: ${age}, Sex: ${sex}

Stage 1 (Clinical Triage) Score: ${s1}/100
${s1Result?.reasoning || ''}

${s2 !== null ? `Stage 2 (Biochemical) Score: ${s2}/100\n${s2Result?.reasoning || ''}` : 'Stage 2: Not completed'}

${!skipS3 ? `Stage 3 (Genetic) Score: ${s3}/100
GBA1 Mutation 1: ${genForm.m1}
GBA1 Mutation 2: ${genForm.m2}
Neurological symptoms confirmed: ${genForm.neuro ? 'Yes' : 'No'}
Genetic scoring:
${s3Breakdown.map(b => `  - ${b}`).join('\n')}` : 'Stage 3: Not completed'}

COMPOSITE RISK SCORE: ${composite}/100
RISK LEVEL: ${riskLvl}
TYPE SUSPICION (from engine): ${typeSusp}
ASSESSMENT CONFIDENCE: ${confidence}
`.trim();

    const fn = async () => {
      const { data, error, usedFallback: fb } = await analyzeStage(3, context, composite, typeSusp);
      if (error) { setAiError(error); setIsAnalyzing(false); return; }
      setUsedFallback(!!fb);
      const finalTypeSusp: GaucherTypeSuspicion = data.typeSuspicion || typeSusp;
      const assignedDoctor = savePrediction(composite, riskLvl, finalTypeSusp, data.reasoning, data.suggestedNextSteps || [], done, s1, s2, s3);
      setFinalData({ composite, riskLevel: riskLvl, typeSuspicion: finalTypeSusp, reasoning: data.reasoning, suggestedNextSteps: data.suggestedNextSteps || [], stagesDone: done, s1, s2, s3, assignedDoctor });
      setView('final');
      setIsAnalyzing(false);
    };
    setLastRetry(() => fn);
    await fn();
  };

  // ── Shared card header ──────────────────────────────────────────────────────
  const CardHeader = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
    <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10 scale-150">{icon}</div>
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-2xl bg-cyan-500 flex items-center justify-center shrink-0">{icon}</div>
        <div>
          <h2 className="text-xl font-black tracking-tight">{title}</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{subtitle}</p>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEWS
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Final Result ─────────────────────────────────────────────────────────────
  if (view === 'final' && finalData) {
    const { composite, riskLevel, typeSuspicion, reasoning, suggestedNextSteps, stagesDone: done, s1, s2, s3, assignedDoctor } = finalData;
    const rColor = riskLevel === 'High' ? 'text-rose-600' : riskLevel === 'Medium' ? 'text-amber-500' : 'text-emerald-600';
    const rBadge = riskLevel === 'High' ? 'bg-rose-100 text-rose-700' : riskLevel === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
    const typeColors: Record<string, string> = { 'Type 1': 'bg-blue-100 text-blue-700', 'Type 2': 'bg-rose-100 text-rose-700', 'Type 3': 'bg-purple-100 text-purple-700', 'Undetermined': 'bg-slate-100 text-slate-600' };
    const stageLabels: Record<number, string> = { 1: 'Symptoms', 2: 'Lab Tests', 3: 'Genetics' };

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 px-4 md:px-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-black text-slate-900">Assessment Complete</h2>
          <button onClick={resetAll} className="flex items-center gap-2 text-cyan-600 font-bold bg-cyan-50 px-4 py-2 rounded-xl hover:underline transition-all active:scale-95">
            <RefreshCcw className="w-4 h-4" /> New Assessment
          </button>
        </div>

        {/* Doctor assignment notice — shown prominently */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-0.5">Your results have been sent to</p>
            <p className="text-lg font-black text-indigo-900">{assignedDoctor.name}</p>
            <p className="text-sm text-indigo-600">{assignedDoctor.specialty} · Will review your case and follow up with you</p>
          </div>
          <span className="shrink-0 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">Pending Review</span>
        </div>

        {/* Stage completion badges */}
        <div className="flex flex-wrap gap-2">
          {([1, 2, 3] as const).map(s => {
            const completed = done.includes(s);
            return (
              <span key={s} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                completed ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-400'
              }`}>
                {completed ? <Check className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {completed ? '✓' : '—'} {stageLabels[s]}
              </span>
            );
          })}
          {typeSuspicion !== 'Undetermined' && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${typeColors[typeSuspicion]}`}>
              <Dna className="w-3 h-3" /> Gaucher {typeSuspicion} suspected
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* What this means */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-50 flex items-center justify-center"><BrainCircuit className="w-6 h-6 text-cyan-600" /></div>
                <h3 className="text-lg font-bold text-slate-900">What This Means For You</h3>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{reasoning}</p>
            </div>

            {/* What to do next */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center"><Stethoscope className="w-6 h-6 text-indigo-600" /></div>
                <h3 className="text-lg font-bold text-slate-900">What To Do Next</h3>
              </div>
              <ol className="space-y-3">
                {suggestedNextSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 text-[10px] font-black mt-0.5">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="space-y-4">
            {/* Overall Score */}
            <div className="bg-slate-900 text-white p-6 rounded-3xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Overall Risk Score</p>
              <div className={`text-7xl font-black ${rColor} mb-1`}>{composite}</div>
              <div className="text-slate-400 text-sm mb-4">/ 100</div>
              <span className={`inline-block px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${rBadge}`}>{riskLevel} Risk</span>
            </div>

            {/* Score breakdown */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">How The Score Was Calculated</p>
              {[{ label: 'Symptoms', val: s1 }, { label: 'Lab Tests', val: s2 }, { label: 'Genetics', val: s3 }].map(({ label, val }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                    <span>{label}</span>
                    <span>{val !== null ? `${val}/100` : '—'}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    {val !== null && <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${val}%` }} />}
                  </div>
                </div>
              ))}
            </div>

            {/* Confidence */}
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 text-xs text-slate-500 leading-relaxed">
              <p className="font-black text-slate-700 mb-1">How Confident Is This Result?</p>
              {getConfidenceLabel(done)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Stage 2 Result ────────────────────────────────────────────────────────────
  if (view === 's2result' && s2Result) {
    const activeStep: 1|2|3 = 3;
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-0 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <Stepper active={activeStep} done={[1, 2]} />
        <FallbackNotice />
        <StageScoreCard stage={2} score={s2Result.score} label={s2Result.score >= STAGE_3_UNLOCK_THRESHOLD ? 'Biochemical markers abnormal — genetic panel recommended' : 'Biochemical results mildly abnormal'} />
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <CardHeader icon={<FlaskConical className="w-6 h-6 text-white" />} title="Lab Results Analysis" subtitle="Step 2 Result" />
          <div className="p-8 space-y-6">
            <p className="text-sm text-slate-700 leading-relaxed">{s2Result.reasoning}</p>
            {s2Result.keyFindings.length > 0 && (
              <div>
                <p className={labelCls + ' mb-3'}>What stood out</p>
                <ul className="space-y-2">
                  {s2Result.keyFindings.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <Activity className="w-4 h-4 text-cyan-500 mt-0.5 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <ErrorBanner />
            <div className="flex flex-col gap-3 pt-2">
              <button onClick={() => runFinal(true)} disabled={isAnalyzing} className="w-full py-4 bg-slate-700 hover:bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-30 flex items-center justify-center gap-2 active:scale-[0.98]">
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ChevronRight className="w-4 h-4" /> Get My Results Now (Symptoms + Lab Tests)</>}
              </button>
              <button onClick={() => setView('s3form')} disabled={isAnalyzing} className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-30 flex items-center justify-center gap-2 active:scale-[0.98]">
                <Dna className="w-4 h-4" /> Add Genetic Test Results (Optional)
              </button>
              <button onClick={resetAll} className="py-3 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600 transition-colors">Discard Case</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Stage 2 Form ──────────────────────────────────────────────────────────────
  if (view === 's2form') {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-0 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <Stepper active={2} done={[1]} />
        <FallbackNotice />
        <ErrorBanner />
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <CardHeader icon={<FlaskConical className="w-6 h-6 text-white" />} title="Lab Test Results" subtitle="Step 2 · Optional — Only if you have blood test results" />
          <div className="p-8 space-y-6">
            <p className="text-xs text-slate-500 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
              Enter the values from your blood test results below. You can leave any test blank if it wasn't done — the system will work with whatever is available.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={fieldCls}>
                <label className={labelCls}>Enzyme Level (β-Glucocerebrosidase) <span className="text-slate-300">nmol/hr/mg</span></label>
                <input type="number" step="0.1" min="0" placeholder="Normal range: 25–100" value={bioForm.bge}
                  onChange={e => setBioForm(p => ({ ...p, bge: e.target.value }))} className={inputCls} />
              </div>
              <div className={fieldCls}>
                <label className={labelCls}>Platelet Count <span className="text-slate-300">×10⁹/L</span></label>
                <input type="number" step="1" min="0" placeholder="Normal range: ≥ 150" value={bioForm.plt}
                  onChange={e => setBioForm(p => ({ ...p, plt: e.target.value }))} className={inputCls} />
              </div>
              <div className={fieldCls}>
                <label className={labelCls}>Hemoglobin <span className="text-slate-300">g/dL</span></label>
                <input type="number" step="0.1" min="0" placeholder="Normal: Men ≥13, Women ≥12" value={bioForm.hb}
                  onChange={e => setBioForm(p => ({ ...p, hb: e.target.value }))} className={inputCls} />
              </div>
              <div className={fieldCls}>
                <label className={labelCls}>Chitotriosidase (disease marker) <span className="text-slate-300">nmol/hr/mL</span></label>
                <input type="number" step="0.1" min="0" placeholder="Normal range: &lt; 25" value={bioForm.chito}
                  onChange={e => setBioForm(p => ({ ...p, chito: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <button onClick={runStage2} disabled={isAnalyzing || (!bioForm.bge && !bioForm.plt && !bioForm.hb && !bioForm.chito)}
                className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-30 flex items-center justify-center gap-3 active:scale-[0.98]">
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><FlaskConical className="w-5 h-5" /> Analyse Lab Results</>}
              </button>
              <button onClick={() => runFinal(true)} disabled={isAnalyzing} className="py-3 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600 transition-colors">
                Skip — Get my results based on symptoms only
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Stage 1 Result ────────────────────────────────────────────────────────────
  if (view === 's1result' && s1Result) {
    const canProceed = s1Result.score >= STAGE_2_UNLOCK_THRESHOLD;
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-0 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <Stepper active={2} done={[1]} />
        <FallbackNotice />
        <StageScoreCard stage={1} score={s1Result.score} label={
          s1Result.score >= 65 ? 'High suspicion — biochemical assessment strongly advised' :
          canProceed ? 'Moderate suspicion — biochemical assessment recommended' :
          'Low suspicion — monitor symptoms'
        } />
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <CardHeader icon={<BrainCircuit className="w-6 h-6 text-white" />} title="Symptoms Analysis" subtitle="Stage 1 Result" />
          <div className="p-8 space-y-5">
            <p className="text-sm text-slate-700 leading-relaxed">{s1Result.reasoning}</p>
            {s1Result.keyFindings.length > 0 && (
              <div>
                <p className={labelCls + ' mb-3'}>What stood out</p>
                <ul className="space-y-2">
                  {s1Result.keyFindings.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <Activity className="w-4 h-4 text-cyan-500 mt-0.5 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!canProceed && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 font-medium">
                Your symptom score is below the level where lab tests are routinely recommended, but you can still add lab results if you have them.
              </div>
            )}
            <ErrorBanner />
            <div className="flex flex-col gap-3 pt-2">
              <button onClick={() => setView('s2form')} disabled={isAnalyzing}
                className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-30 flex items-center justify-center gap-2 active:scale-[0.98]">
                <FlaskConical className="w-4 h-4" /> {canProceed ? 'Add Lab Test Results (Recommended)' : 'Add Lab Test Results (Optional)'}
              </button>
              <button onClick={() => runFinal(true)} disabled={isAnalyzing}
                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-30 flex items-center justify-center gap-2 active:scale-[0.98]">
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get My Results Now (Symptoms Only)"}
              </button>
              <button onClick={resetAll} className="py-3 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600 transition-colors">Discard Case</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Stage 3 Form ──────────────────────────────────────────────────────────────
  if (view === 's3form') {
    const mutations: GBA1Mutation[] = ['N370S', 'L444P', '84GG', 'IVS2+1', 'D409H', 'Other known pathogenic', 'Unknown / Not tested', 'None detected'];
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-0 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <Stepper active={3} done={[1, 2]} />
        <FallbackNotice />
        <ErrorBanner />
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <CardHeader icon={<Dna className="w-6 h-6 text-white" />} title="Genetic Test Results" subtitle="Step 3 · Optional — Only if you have genetic test results" />
          <div className="p-8 space-y-6">
            <p className="text-xs text-slate-500 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
              If you have had a GBA1 genetic test, select the gene variants found below. If you haven't had a genetic test yet, leave both as "Unknown / Not tested" and click Generate.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={fieldCls}>
                <label className={labelCls}>Gene Variant 1 (GBA1 Allele 1)</label>
                <select value={genForm.m1} onChange={e => setGenForm(p => ({ ...p, m1: e.target.value as GBA1Mutation }))} className={selectCls}>
                  {mutations.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className={fieldCls}>
                <label className={labelCls}>Gene Variant 2 (GBA1 Allele 2)</label>
                <select value={genForm.m2} onChange={e => setGenForm(p => ({ ...p, m2: e.target.value as GBA1Mutation }))} className={selectCls}>
                  {mutations.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <SymptomToggle checked={genForm.neuro} onChange={v => setGenForm(p => ({ ...p, neuro: v }))}
              label="Doctor has confirmed neurological symptoms (e.g. eye movement problems, coordination issues, seizures)" />
            <div className="flex flex-col gap-3 pt-2">
              <button onClick={() => runFinal(false)} disabled={isAnalyzing}
                className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all disabled:opacity-30 flex items-center justify-center gap-3 active:scale-[0.98]">
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><BrainCircuit className="w-5 h-5" /> Get My Full Assessment Results</>}
              </button>
              <button onClick={resetAll} className="py-3 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600 transition-colors">Discard Case</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Stage 1 Form (default) ────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-0 pb-20">
      <Stepper active={1} done={[]} />
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <CardHeader icon={<BrainCircuit className="w-6 h-6 text-white" />} title="Tell Us About Your Symptoms" subtitle="Step 1 of 3 · Takes about 2 minutes" />
        <div className="p-8 space-y-7">
          {/* Demographics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={fieldCls}>
              <label className={labelCls}>Patient Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className={fieldCls}>
                <label className={labelCls}>Age</label>
                <input type="number" value={age} onChange={e => setAge(e.target.value)} className={inputCls} required />
              </div>
              <div className={fieldCls}>
                <label className={labelCls}>Sex</label>
                <select value={sex} onChange={e => setSex(e.target.value)} className={selectCls} required>
                  <option value="">Select</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
            </div>
          </div>

          {/* Risk factors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={fieldCls}>
              <label className={labelCls}>Ethnic Background</label>
              <select value={ethnicity} onChange={e => setEthnicity(e.target.value as EthnicBackground | '')} className={selectCls}>
                <option value="">Not specified</option>
                <option>African</option>
                <option>Other / Unknown</option>
              </select>
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>First-Degree Family History of Gaucher</label>
              <SymptomToggle checked={familyHistory} onChange={setFamilyHistory} label="Confirmed in parent, sibling, or child" />
            </div>
          </div>

          {/* Symptom checklist */}
          <div>
            <label className={labelCls + ' mb-3 block'}>Which of these symptoms do you have? <span className="text-slate-300 normal-case tracking-normal font-normal">(select all that apply)</span></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <SymptomToggle checked={symptoms.splenomegaly}       onChange={v => sym('splenomegaly', v)}       label="Enlarged spleen (splenomegaly)" />
              <SymptomToggle checked={symptoms.hepatomegaly}       onChange={v => sym('hepatomegaly', v)}       label="Enlarged liver (hepatomegaly)" />
              <SymptomToggle checked={symptoms.bonePain}           onChange={v => sym('bonePain', v)}           label="Bone pain or bone crisis" />
              <SymptomToggle checked={symptoms.thrombocytopenia}   onChange={v => sym('thrombocytopenia', v)}   label="Known low platelet count" />
              <SymptomToggle checked={symptoms.anaemia}            onChange={v => sym('anaemia', v)}            label="Anaemia (confirmed or suspected)" />
              <SymptomToggle checked={symptoms.easyBruising}       onChange={v => sym('easyBruising', v)}       label="Easy or unexplained bruising" />
              <SymptomToggle checked={symptoms.fatigue}            onChange={v => sym('fatigue', v)}            label="Chronic fatigue" />
              <SymptomToggle checked={symptoms.neurologicalSymptoms} onChange={v => sym('neurologicalSymptoms', v)} label="Neurological symptoms" />
            </div>
          </div>

          {/* Temporal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={fieldCls}>
              <label className={labelCls}>Age of Symptom Onset</label>
              <select value={symptoms.onsetAge} onChange={e => sym('onsetAge', e.target.value as any)} className={selectCls}>
                <option value="">Not specified</option>
                <option>Childhood ({"<"} 12 yrs)</option>
                <option>Adolescent (12–18 yrs)</option>
                <option>Adult ({">"} 18 yrs)</option>
              </select>
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>Symptom Duration</label>
              <select value={symptoms.duration} onChange={e => sym('duration', e.target.value as any)} className={selectCls}>
                <option value="">Not specified</option>
                <option>{"<"} 6 months</option>
                <option>6–24 months</option>
                <option>{">"} 24 months</option>
              </select>
            </div>
          </div>

          {/* Additional context */}
          <div className={fieldCls}>
            <label className={labelCls}>Anything else to add? <span className="text-slate-300 normal-case tracking-normal font-normal">(optional)</span></label>
            <textarea value={additionalContext} onChange={e => setAdditionalContext(e.target.value)}
              className="w-full h-28 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all resize-none font-medium text-slate-700 text-sm"
              placeholder="e.g. my doctor found an enlarged spleen during a scan; I've had unexplained tiredness for months…" />
          </div>

          <ErrorBanner />

          <button
            onClick={runStage1}
            disabled={isAnalyzing || !name.trim() || !age || !sex}
            className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-30"
          >
            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><BrainCircuit className="w-5 h-5" /> Analyse My Symptoms</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewPredictionForm;
