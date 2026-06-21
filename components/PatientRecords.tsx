
import React, { useState } from 'react';
import { Prediction, RiskLevel, User } from '../types';
import {
  Search, FileText, CheckCircle2, AlertCircle, MessageSquare,
  User as UserIcon, Dna, Check, ChevronDown, ChevronUp,
  FlaskConical, Stethoscope, Activity,
} from 'lucide-react';
import { INITIAL_DOCTORS } from '../constants';

interface PatientRecordsProps {
  predictions: Prediction[];
  currentUser: User | null;
  onUpdatePrediction: (prediction: Prediction) => void;
}

/** Format symptom booleans as a readable list */
function formatSymptoms(s: Prediction['symptoms']): string {
  if (!s) return 'Not recorded';
  const present = [
    s.splenomegaly      && 'Enlarged spleen',
    s.hepatomegaly      && 'Enlarged liver',
    s.bonePain          && 'Bone pain',
    s.thrombocytopenia  && 'Low platelet count (known)',
    s.anaemia           && 'Anaemia',
    s.easyBruising      && 'Easy bruising',
    s.fatigue           && 'Chronic fatigue',
    s.neurologicalSymptoms && 'Neurological symptoms',
  ].filter(Boolean) as string[];
  return present.length > 0 ? present.join(', ') : 'No specific symptoms selected';
}

const PatientRecords: React.FC<PatientRecordsProps> = ({ predictions, currentUser, onUpdatePrediction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<string>('All');
  const [selectedRecord, setSelectedRecord] = useState<Prediction | null>(null);
  const [doctorComment, setDoctorComment] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = predictions.filter(p => {
    if (currentUser?.role === 'User' && p.userId !== currentUser.id) return false;
    if (currentUser?.role === 'Doctor' && p.reviewingDoctorId !== currentUser.id) return false;
    const matchesSearch = p.patientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'All' || p.riskLevel === filter || p.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleReviewSubmit = () => {
    if (!selectedRecord) return;
    const updated: Prediction = {
      ...selectedRecord,
      status: 'Reviewed',
      doctorComment,
      reviewedAt: new Date().toLocaleDateString(),
    };
    onUpdatePrediction(updated);
    setSelectedRecord(null);
    setDoctorComment('');
  };

  const openReview = (p: Prediction) => {
    setSelectedRecord(p);
    setDoctorComment('');
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Search + Filter */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={currentUser?.role === 'Doctor' ? 'Search patient cases...' : 'Search my assessments...'}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none transition-all text-sm shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 overflow-x-auto w-full md:w-auto shadow-sm">
          {['All', 'Pending Review', 'Reviewed', RiskLevel.HIGH].map(r => (
            <button key={r} onClick={() => setFilter(r)}
              className={`px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold whitespace-nowrap transition-all ${
                filter === r ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
              }`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Records list */}
      <div className="space-y-4">
        {filtered.length > 0 ? filtered.map(p => {
          const doctor = INITIAL_DOCTORS.find(d => d.id === p.reviewingDoctorId);
          const isExpanded = expandedId === p.id;

          return (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-all">
              {/* Card header row */}
              <div className="p-5 md:p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    {/* Name + Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                          p.riskLevel === RiskLevel.HIGH ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          <UserIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 leading-none mb-1">{p.patientName}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Case ID: {p.id}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest ${
                        p.status === 'Reviewed'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          : 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                      }`}>
                        {p.status === 'Pending Review' ? 'Awaiting Review' : p.status}
                      </span>
                    </div>

                    {/* Summary grid */}
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 py-4 border-y border-slate-50">
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-black mb-1 tracking-widest">Risk Level</p>
                        <p className={`text-sm font-bold ${p.riskLevel === RiskLevel.HIGH ? 'text-rose-600' : p.riskLevel === RiskLevel.MEDIUM ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {p.riskLevel} ({p.riskScore}%)
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-black mb-1 tracking-widest">Assigned Doctor</p>
                        <p className="text-sm font-bold text-slate-900 truncate">{doctor?.name ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-black mb-1 tracking-widest">Submitted</p>
                        <p className="text-sm font-bold text-slate-700">{p.date}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-black mb-1 tracking-widest">Patient</p>
                        <p className="text-sm font-bold text-slate-700">{p.patientAge}y · {p.patientSex}</p>
                      </div>
                    </div>

                    {/* Stage badges */}
                    {p.completedStages && p.completedStages.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {([1, 2, 3] as const).map(s => {
                          const done = p.completedStages!.includes(s);
                          const label = { 1: 'Symptoms', 2: 'Lab Tests', 3: 'Genetics' }[s];
                          return (
                            <span key={s} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold ${
                              done ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {done ? <Check className="w-2.5 h-2.5" /> : null}
                              {label}
                            </span>
                          );
                        })}
                        {p.typeSuspicion && p.typeSuspicion !== 'Undetermined' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-700">
                            <Dna className="w-2.5 h-2.5" /> {p.typeSuspicion}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Doctor's note (patient view) */}
                    {p.doctorComment ? (
                      <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                        <p className="text-[10px] font-black text-indigo-700 mb-1.5 flex items-center gap-1.5 uppercase tracking-widest">
                          <MessageSquare className="w-3 h-3" /> Doctor's Note
                        </p>
                        <p className="text-sm text-slate-700 leading-relaxed italic">"{p.doctorComment}"</p>
                        <div className="mt-3 pt-3 border-t border-indigo-100/50 flex justify-between items-center">
                          <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-tighter">Reviewed on {p.reviewedAt}</span>
                          <span className="text-[10px] text-indigo-400 font-medium">by {doctor?.name}</span>
                        </div>
                      </div>
                    ) : (
                      currentUser?.role === 'User' && (
                        <p className="text-xs text-slate-400 italic text-center py-1">
                          Waiting for {doctor?.name} to review your case…
                        </p>
                      )
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="md:w-48 flex md:flex-col justify-end gap-2">
                    {currentUser?.role === 'Doctor' && p.status === 'Pending Review' && (
                      <button onClick={() => openReview(p)}
                        className="flex-1 w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-transform active:scale-95">
                        <CheckCircle2 className="w-4 h-4" /> Review Case
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      className="flex-1 w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95">
                      <FileText className="w-4 h-4" />
                      {isExpanded ? 'Hide Details' : 'Full Report'}
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expandable full report */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/40 px-6 py-6 space-y-6 animate-in slide-in-from-top duration-300">

                  {/* Patient responses */}
                  {p.symptoms && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5" /> Stage 1 — What the Patient Reported
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="bg-white rounded-xl p-3 border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Symptoms</span>
                          <p className="text-slate-700 font-medium mt-1">{formatSymptoms(p.symptoms)}</p>
                        </div>
                        {p.ethnicBackground && (
                          <div className="bg-white rounded-xl p-3 border border-slate-100">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Background</span>
                            <p className="text-slate-700 font-medium mt-1">{p.ethnicBackground}</p>
                          </div>
                        )}
                        {p.familyHistory !== undefined && (
                          <div className="bg-white rounded-xl p-3 border border-slate-100">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Family History of Gaucher</span>
                            <p className="text-slate-700 font-medium mt-1">{p.familyHistory ? 'Yes — first-degree relative confirmed' : 'No'}</p>
                          </div>
                        )}
                        {p.symptoms.onsetAge && (
                          <div className="bg-white rounded-xl p-3 border border-slate-100">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Onset Age</span>
                            <p className="text-slate-700 font-medium mt-1">{p.symptoms.onsetAge}</p>
                          </div>
                        )}
                        {p.symptoms.duration && (
                          <div className="bg-white rounded-xl p-3 border border-slate-100">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">How Long</span>
                            <p className="text-slate-700 font-medium mt-1">{p.symptoms.duration}</p>
                          </div>
                        )}
                        {p.additionalContext && (
                          <div className="bg-white rounded-xl p-3 border border-slate-100 md:col-span-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Extra Notes from Patient</span>
                            <p className="text-slate-700 font-medium mt-1 italic">"{p.additionalContext}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Lab results */}
                  {p.biochemical && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <FlaskConical className="w-3.5 h-3.5" /> Stage 2 — Lab Test Results
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {p.biochemical.betaGlucocerebrosidase !== undefined && (
                          <div className="bg-white rounded-xl p-3 border border-slate-100">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Enzyme Level</span>
                            <p className="text-slate-900 font-bold mt-1">{p.biochemical.betaGlucocerebrosidase} <span className="text-slate-400 font-normal text-xs">nmol/hr/mg</span></p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Normal: 25–100</p>
                          </div>
                        )}
                        {p.biochemical.plateletCount !== undefined && (
                          <div className="bg-white rounded-xl p-3 border border-slate-100">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Platelet Count</span>
                            <p className="text-slate-900 font-bold mt-1">{p.biochemical.plateletCount} <span className="text-slate-400 font-normal text-xs">×10⁹/L</span></p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Normal: ≥ 150</p>
                          </div>
                        )}
                        {p.biochemical.hemoglobin !== undefined && (
                          <div className="bg-white rounded-xl p-3 border border-slate-100">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hemoglobin</span>
                            <p className="text-slate-900 font-bold mt-1">{p.biochemical.hemoglobin} <span className="text-slate-400 font-normal text-xs">g/dL</span></p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Normal: M≥13, F≥12</p>
                          </div>
                        )}
                        {p.biochemical.chitotriosidase !== undefined && (
                          <div className="bg-white rounded-xl p-3 border border-slate-100">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Chitotriosidase</span>
                            <p className="text-slate-900 font-bold mt-1">{p.biochemical.chitotriosidase} <span className="text-slate-400 font-normal text-xs">nmol/hr/mL</span></p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Normal: &lt; 25</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Genetic data */}
                  {p.genetic && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Dna className="w-3.5 h-3.5" /> Stage 3 — Genetic Panel Results
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="bg-white rounded-xl p-3 border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">GBA1 Allele 1</span>
                          <p className="text-slate-700 font-medium mt-1">{p.genetic.mutation1}</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">GBA1 Allele 2</span>
                          <p className="text-slate-700 font-medium mt-1">{p.genetic.mutation2}</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Neurological Symptoms</span>
                          <p className="text-slate-700 font-medium mt-1">{p.genetic.neurologicalConfirmed ? 'Yes — confirmed' : 'No'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI reasoning */}
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" /> AI Assessment Summary
                    </p>
                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                      <p className="text-sm text-slate-700 leading-relaxed">{p.reasoning}</p>
                    </div>
                  </div>

                  {/* Recommended steps */}
                  {p.suggestedNextSteps?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Recommended Actions</p>
                      <ol className="space-y-2">
                        {p.suggestedNextSteps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 text-[10px] font-black mt-0.5">{i + 1}</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Stage score breakdown */}
                  {p.stageScores && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Score Breakdown</p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Symptoms', val: p.stageScores.stage1 },
                          { label: 'Lab Tests', val: p.stageScores.stage2 },
                          { label: 'Genetics', val: p.stageScores.stage3 },
                        ].map(({ label, val }) => (
                          <div key={label} className="bg-white rounded-xl p-3 border border-slate-100 text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                            <p className="text-xl font-black text-slate-900">{val !== null ? val : '—'}</p>
                            {val !== null && <p className="text-[9px] text-slate-400">/ 100</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-4 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-slate-200" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-600 font-bold">No Records Found</p>
              <p className="text-slate-400 text-sm">Your assessment history will appear here once you complete an analysis.</p>
            </div>
          </div>
        )}
      </div>

      {/* Doctor Review Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-end md:items-center justify-center z-[60] p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">

            {/* Modal header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Review Case</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {selectedRecord.patientName} · {selectedRecord.patientAge}y · {selectedRecord.patientSex} · Submitted {selectedRecord.date}
                </p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">✕</button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">

              {/* Risk summary */}
              <div className={`p-4 rounded-2xl flex items-center gap-4 ${
                selectedRecord.riskLevel === RiskLevel.HIGH ? 'bg-rose-50 border border-rose-200' :
                selectedRecord.riskLevel === RiskLevel.MEDIUM ? 'bg-amber-50 border border-amber-200' :
                'bg-emerald-50 border border-emerald-200'
              }`}>
                <div className="text-center">
                  <div className={`text-4xl font-black ${
                    selectedRecord.riskLevel === RiskLevel.HIGH ? 'text-rose-600' :
                    selectedRecord.riskLevel === RiskLevel.MEDIUM ? 'text-amber-600' : 'text-emerald-600'
                  }`}>{selectedRecord.riskScore}</div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">/ 100</div>
                </div>
                <div>
                  <p className="font-black text-slate-900">{selectedRecord.riskLevel} Risk</p>
                  {selectedRecord.typeSuspicion && selectedRecord.typeSuspicion !== 'Undetermined' && (
                    <p className="text-sm text-slate-600 mt-0.5">Suspected: Gaucher {selectedRecord.typeSuspicion}</p>
                  )}
                  {selectedRecord.completedStages && (
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedRecord.completedStages.length} of 3 assessment stages completed
                    </p>
                  )}
                </div>
              </div>

              {/* What the patient reported — symptoms */}
              {selectedRecord.symptoms && (
                <div>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5" /> Symptoms Reported by Patient
                  </p>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-sm text-slate-700">
                    <p><span className="font-semibold">Symptoms:</span> {formatSymptoms(selectedRecord.symptoms)}</p>
                    {selectedRecord.ethnicBackground && <p><span className="font-semibold">Background:</span> {selectedRecord.ethnicBackground}</p>}
                    {selectedRecord.familyHistory !== undefined && <p><span className="font-semibold">Family history:</span> {selectedRecord.familyHistory ? 'Yes' : 'No'}</p>}
                    {selectedRecord.symptoms.onsetAge && <p><span className="font-semibold">Onset:</span> {selectedRecord.symptoms.onsetAge}</p>}
                    {selectedRecord.symptoms.duration && <p><span className="font-semibold">Duration:</span> {selectedRecord.symptoms.duration}</p>}
                    {selectedRecord.additionalContext && <p><span className="font-semibold">Notes:</span> <em>"{selectedRecord.additionalContext}"</em></p>}
                  </div>
                </div>
              )}

              {/* Lab results in review modal */}
              {selectedRecord.biochemical && (
                <div>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5" /> Lab Results Submitted
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedRecord.biochemical.betaGlucocerebrosidase !== undefined && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Enzyme (β-Glucocerebrosidase)</p>
                        <p className="font-bold text-slate-900 mt-1">{selectedRecord.biochemical.betaGlucocerebrosidase} nmol/hr/mg <span className="text-slate-400 font-normal">(norm. 25–100)</span></p>
                      </div>
                    )}
                    {selectedRecord.biochemical.plateletCount !== undefined && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Platelet Count</p>
                        <p className="font-bold text-slate-900 mt-1">{selectedRecord.biochemical.plateletCount} ×10⁹/L <span className="text-slate-400 font-normal">(norm. ≥150)</span></p>
                      </div>
                    )}
                    {selectedRecord.biochemical.hemoglobin !== undefined && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hemoglobin</p>
                        <p className="font-bold text-slate-900 mt-1">{selectedRecord.biochemical.hemoglobin} g/dL <span className="text-slate-400 font-normal">(M≥13, F≥12)</span></p>
                      </div>
                    )}
                    {selectedRecord.biochemical.chitotriosidase !== undefined && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Chitotriosidase</p>
                        <p className="font-bold text-slate-900 mt-1">{selectedRecord.biochemical.chitotriosidase} nmol/hr/mL <span className="text-slate-400 font-normal">(norm. &lt;25)</span></p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Genetic data in review modal */}
              {selectedRecord.genetic && (
                <div>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Dna className="w-3.5 h-3.5" /> Genetic Panel
                  </p>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-sm text-slate-700 space-y-1">
                    <p><span className="font-semibold">GBA1 Allele 1:</span> {selectedRecord.genetic.mutation1}</p>
                    <p><span className="font-semibold">GBA1 Allele 2:</span> {selectedRecord.genetic.mutation2}</p>
                    <p><span className="font-semibold">Neurological symptoms confirmed:</span> {selectedRecord.genetic.neurologicalConfirmed ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              )}

              {/* AI reasoning */}
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> AI Assessment
                </p>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-xs text-slate-600 leading-relaxed">{selectedRecord.reasoning}</p>
                </div>
              </div>

              {/* Doctor's comment box */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex justify-between items-center">
                  Your Clinical Notes
                  <span className="text-[10px] text-slate-400 font-normal">{doctorComment.length} characters</span>
                </label>
                <textarea
                  autoFocus
                  value={doctorComment}
                  onChange={e => setDoctorComment(e.target.value)}
                  className="w-full h-36 p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm resize-none"
                  placeholder="Write your clinical notes here — what you found, what you recommend, and any follow-up actions for the patient…"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="p-6 bg-slate-50/50 flex gap-4 safe-area-bottom border-t border-slate-100">
              <button onClick={() => setSelectedRecord(null)} className="flex-1 py-4 text-slate-500 font-bold text-sm">Cancel</button>
              <button
                onClick={handleReviewSubmit}
                disabled={!doctorComment.trim()}
                className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm disabled:opacity-30 shadow-xl shadow-slate-200 transition-transform active:scale-95">
                Send to Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientRecords;
