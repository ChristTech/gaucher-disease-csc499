
import React, { useState } from 'react';
import { Loader2, BrainCircuit, Stethoscope, MessageSquareQuote, ChevronRight, RefreshCcw, Sparkles, WifiOff, CreditCard, AlertTriangle, RotateCcw, Cpu } from 'lucide-react';
import { analyzeClinicalData, AIErrorType } from '../services/geminiService';
import { User, Prediction, RiskLevel } from '../types';
import { INITIAL_DOCTORS } from '../constants';

interface NewPredictionFormProps {
  currentUser: User | null;
  onSavePrediction: (prediction: Prediction) => void;
}

const NewPredictionForm: React.FC<NewPredictionFormProps> = ({ currentUser, onSavePrediction }) => {
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    age: '',
    sex: '',
    symptoms: '',
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [assignedDoc, setAssignedDoc] = useState<User | null>(null);
  const [aiError, setAiError] = useState<{ type: AIErrorType; message: string } | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  // Keeps the last prompt so the retry button can re-submit without user re-typing
  const [lastPrompt, setLastPrompt] = useState<{ prompt: string; history: { role: 'user' | 'model'; text: string }[] } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const finalizePrediction = (data: any) => {
    if (data && data.isFinal) {
      const doctor = INITIAL_DOCTORS[Math.floor(Math.random() * INITIAL_DOCTORS.length)];
      setAssignedDoc(doctor);
      
      const newPrediction: Prediction = {
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser?.id || 'anonymous',
        patientName: formData.name,
        patientAge: formData.age,
        patientSex: formData.sex,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'Pending Review',
        riskLevel: data.riskLevel as RiskLevel,
        riskScore: data.riskScore,
        reasoning: data.reasoning,
        suggestedNextSteps: data.suggestedNextSteps,
        reviewingDoctorId: doctor.id
      };
      onSavePrediction(newPrediction);
    }
  };

  const startAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symptoms.trim()) return;

    setIsAnalyzing(true);
    setAiError(null);
    setUsedFallback(false);
    const initialPrompt = `New Case: Patient ${formData.name}, Age ${formData.age}, Sex ${formData.sex}. Symptoms: ${formData.symptoms}.`;
    setLastPrompt({ prompt: initialPrompt, history: [] });

    const { data, error, usedFallback: fb } = await analyzeClinicalData(initialPrompt, []);
    if (error) {
      setAiError(error);
      setIsAnalyzing(false);
      return;
    }
    setUsedFallback(!!fb);
    setResult(data);
    setHistory([{ role: 'user', text: initialPrompt }]);
    finalizePrediction(data);
    setIsAnalyzing(false);
  };

  const submitFollowUp = async () => {
    setIsAnalyzing(true);
    setAiError(null);
    const answersText = Object.entries(followUpAnswers)
      .map(([q, a]) => `Q: ${q}\nA: ${a}`)
      .join('\n');
    
    const newHistory = [...history];
    if (result) {
      newHistory.push({ role: 'model', text: JSON.stringify(result) });
    }

    const followUpPrompt = `Additional Context Provided:\n${answersText}`;
    setLastPrompt({ prompt: followUpPrompt, history: newHistory });

    const { data, error, usedFallback: fb } = await analyzeClinicalData(followUpPrompt, newHistory);
    if (error) {
      setAiError(error);
      setIsAnalyzing(false);
      return;
    }
    setUsedFallback(!!fb);
    setResult(data);
    setHistory([...newHistory, { role: 'user', text: answersText }]);
    finalizePrediction(data);
    setFollowUpAnswers({});
    setIsAnalyzing(false);
  };

  const resetForm = () => {
    setResult(null);
    setHistory([]);
    setFollowUpAnswers({});
    setAssignedDoc(null);
    setAiError(null);
    setUsedFallback(false);
    setLastPrompt(null);
    setFormData({ 
      name: currentUser?.name || '', 
      age: '', 
      sex: '', 
      symptoms: '',
    });
  };

  /** Retry the exact last request without the user having to re-type anything */
  const retryLastRequest = async () => {
    if (!lastPrompt) return;
    setIsAnalyzing(true);
    setAiError(null);
    const { data, error, usedFallback: fb } = await analyzeClinicalData(lastPrompt.prompt, lastPrompt.history);
    if (error) {
      setAiError(error);
      setIsAnalyzing(false);
      return;
    }
    setUsedFallback(!!fb);
    if (lastPrompt.history.length === 0) {
      setResult(data);
      setHistory([{ role: 'user', text: lastPrompt.prompt }]);
      finalizePrediction(data);
    } else {
      setResult(data);
      setHistory([...lastPrompt.history, { role: 'user', text: lastPrompt.prompt }]);
      finalizePrediction(data);
      setFollowUpAnswers({});
    }
    setIsAnalyzing(false);
  };

  /** Small notice shown when Groq answered instead of Gemini */
  const FallbackNotice = () => {
    if (!usedFallback) return null;
    return (
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-violet-50 border border-violet-200 rounded-2xl text-xs animate-in fade-in duration-500">
        <Cpu className="w-4 h-4 text-violet-500 shrink-0" />
        <span className="text-violet-700 font-semibold">
          Analysis powered by <span className="font-black">Llama 3.3 (Groq)</span> — Gemini was temporarily unavailable.
        </span>
      </div>
    );
  };

  /** Inline error banner shown above the form when the AI call fails */
  const ErrorBanner = () => {
    if (!aiError) return null;

    const config: Record<AIErrorType, { icon: React.ReactNode; title: string; bg: string; border: string; iconBg: string; titleColor: string }> = {
      quota: {
        icon: <CreditCard className="w-5 h-5 text-amber-600" />,
        title: 'API Quota Reached',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        iconBg: 'bg-amber-100',
        titleColor: 'text-amber-800',
      },
      network: {
        icon: <WifiOff className="w-5 h-5 text-blue-600" />,
        title: 'No Connection',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        iconBg: 'bg-blue-100',
        titleColor: 'text-blue-800',
      },
      unknown: {
        icon: <AlertTriangle className="w-5 h-5 text-rose-600" />,
        title: 'Analysis Failed',
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        iconBg: 'bg-rose-100',
        titleColor: 'text-rose-800',
      },
    };

    const { icon, title, bg, border, iconBg, titleColor } = config[aiError.type];

    return (
      <div className={`${bg} border ${border} rounded-2xl p-5 flex gap-4 items-start animate-in slide-in-from-top duration-300`}>
        <div className={`${iconBg} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-black text-sm ${titleColor} mb-1`}>{title}</p>
          <p className="text-xs text-slate-600 leading-relaxed">{aiError.message}</p>
        </div>
        {lastPrompt && (
          <button
            onClick={retryLastRequest}
            disabled={isAnalyzing}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
      </div>
    );
  };

  if (result?.isFinal) {
    const displayDoctor = assignedDoc || INITIAL_DOCTORS[0];
    
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 px-4 md:px-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-black text-slate-900">Analysis Complete</h2>
          <button onClick={resetForm} className="flex items-center gap-2 text-cyan-600 font-bold hover:underline bg-cyan-50 px-4 py-2 rounded-xl transition-all active:scale-95">
            <RefreshCcw className="w-4 h-4" /> Reset
          </button>
        </div>

        <FallbackNotice />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-cyan-50 flex items-center justify-center">
                  <BrainCircuit className="w-6 h-6 text-cyan-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Clinical Reasoning</h3>
              </div>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm">{result.reasoning}</p>
            </div>

            <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                <Stethoscope className="w-7 h-7 text-indigo-100" />
              </div>
              <div>
                <h4 className="font-black text-sm uppercase tracking-widest mb-1">Professional Referral</h4>
                <p className="text-xs text-indigo-100 font-medium">This case is automatically flagged for <strong>{displayDoctor.name}</strong> ({displayDoctor.specialty}).</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-4">Risk Level</p>
              <div className={`text-5xl font-black mb-4 ${
                result.riskLevel === 'High' ? 'text-rose-600' : 
                result.riskLevel === 'Medium' ? 'text-amber-500' : 'text-emerald-600'
              }`}>{result.riskLevel}</div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-4">
                <div className={`h-full transition-all duration-1000 ${
                  result.riskLevel === 'High' ? 'bg-rose-500' : 
                  result.riskLevel === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} style={{ width: `${result.riskScore}%` }} />
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{result.riskScore}% Reliability</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
               <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">Recommended Actions</h4>
               <ul className="space-y-3">
                 {result.suggestedNextSteps.map((step: string, idx: number) => (
                   <li key={idx} className="flex gap-3 text-xs text-slate-600 font-medium leading-relaxed">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1 shrink-0" />
                      {step}
                   </li>
                 ))}
               </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (result && !result.isFinal) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-0 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden">
          <div className="bg-slate-900 p-10 text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <Sparkles className="w-12 h-12" />
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500 flex items-center justify-center">
                <MessageSquareQuote className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Personalized Inquiry</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Awaiting Specific Details</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed italic opacity-90 border-l-2 border-cyan-500 pl-4">{result.reasoning}</p>
          </div>
          
          <div className="p-10 space-y-10">
            {result.questions.map((question: string, index: number) => (
              <div key={index} className="space-y-4 animate-in slide-in-from-left duration-500" style={{ animationDelay: `${index * 150}ms` }}>
                <label className="block text-sm font-black text-slate-800 flex items-start gap-4">
                  <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center shrink-0 text-[10px] font-black border border-slate-200 shadow-sm">{index + 1}</span>
                  <span className="pt-1 leading-tight">{question}</span>
                </label>
                <textarea
                  className="w-full p-5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all resize-none h-28 text-sm text-slate-700 font-medium shadow-inner"
                  placeholder="Provide clinical details..."
                  value={followUpAnswers[question] || ''}
                  onChange={(e) => setFollowUpAnswers({ ...followUpAnswers, [question]: e.target.value })}
                />
              </div>
            ))}

            <ErrorBanner />
            
            <div className="flex flex-col md:flex-row gap-4 pt-4">
              <button onClick={resetForm} className="order-2 md:order-1 flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600 transition-colors">Discard Case</button>
              <button 
                onClick={submitFollowUp}
                disabled={isAnalyzing || result.questions.some((q: string) => !followUpAnswers[q]?.trim())}
                className="order-1 md:order-2 flex-[2] py-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-slate-200 transition-all disabled:opacity-30 flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ChevronRight className="w-4 h-4" /> Continue Analysis</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-0">
      <ErrorBanner />
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden mt-4">
        <div className="p-10 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Diagnostic Intake</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">KSU CSC499 ML Module</p>
          </div>
          <div className="hidden sm:flex w-16 h-16 rounded-3xl bg-cyan-50 items-center justify-center">
            <BrainCircuit className="w-8 h-8 text-cyan-600" />
          </div>
        </div>

        <form onSubmit={startAnalysis} className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-bold text-slate-700" required />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Age</label>
                <input type="number" name="age" value={formData.age} onChange={handleInputChange} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-bold text-slate-700" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sex</label>
                <select name="sex" value={formData.sex} onChange={handleInputChange} className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-bold text-slate-700 bg-white" required>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Symptoms & Clinical History</label>
            <textarea name="symptoms" value={formData.symptoms} onChange={handleInputChange} className="w-full h-40 px-5 py-4 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all resize-none font-medium text-slate-700" placeholder="e.g. Enlarged spleen, frequent bruising, bone pain, chronic fatigue..." required />
          </div>
          <button type="submit" disabled={isAnalyzing} className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-[0.98]">
            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><BrainCircuit className="w-5 h-5" /> Start AI Analysis</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewPredictionForm;
