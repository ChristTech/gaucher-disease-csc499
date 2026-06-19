
import React, { useState } from 'react';
import { X, Loader2, BrainCircuit } from 'lucide-react';
import { analyzeClinicalData } from '../services/geminiService';

interface NewPredictionModalProps {
  onClose: () => void;
}

const NewPredictionModal: React.FC<NewPredictionModalProps> = ({ onClose }) => {
  const [symptoms, setSymptoms] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) return;

    setIsAnalyzing(true);
    const data = await analyzeClinicalData(symptoms);
    setResult(data);
    setIsAnalyzing(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-cyan-600" />
            <h2 className="text-xl font-bold text-slate-900">New Clinical Analysis</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {!result ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Clinical Notes & Symptoms
                </label>
                <textarea
                  className="w-full h-48 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all outline-none text-slate-700"
                  placeholder="Enter patient symptoms (e.g., splenomegaly, hepatomegaly, thrombocytopenia, bone pain, fatigue)..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={isAnalyzing || !symptoms.trim()}
                className="w-full py-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing Data...
                  </>
                ) : (
                  'Start AI Analysis'
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <p className="text-sm text-slate-500 font-medium">Risk Assessment</p>
                  <p className={`text-3xl font-bold ${
                    result.riskLevel === 'High' ? 'text-rose-600' : 
                    result.riskLevel === 'Medium' ? 'text-amber-500' : 'text-emerald-600'
                  }`}>
                    {result.riskLevel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 font-medium">Confidence Score</p>
                  <p className="text-3xl font-bold text-slate-900">{result.riskScore}%</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Reasoning</h4>
                <p className="text-slate-600 bg-white p-4 rounded-xl border border-slate-100 text-sm leading-relaxed">
                  {result.reasoning}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Suggested Next Steps</h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {result.suggestedNextSteps.map((step: string, idx: number) => (
                    <li key={idx} className="bg-cyan-50/50 text-cyan-800 text-sm px-4 py-2 rounded-lg border border-cyan-100 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => setResult(null)}
                className="w-full py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
              >
                Analyze Another Case
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewPredictionModal;
