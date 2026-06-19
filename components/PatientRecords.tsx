
import React, { useState } from 'react';
import { Prediction, RiskLevel, User } from '../types';
import { Search, Filter, FileText, CheckCircle2, AlertCircle, MessageSquare, ChevronRight, User as UserIcon } from 'lucide-react';
import { INITIAL_DOCTORS } from '../constants';

interface PatientRecordsProps {
  predictions: Prediction[];
  currentUser: User | null;
  onUpdatePrediction: (prediction: Prediction) => void;
}

const PatientRecords: React.FC<PatientRecordsProps> = ({ predictions, currentUser, onUpdatePrediction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<string>('All');
  const [selectedRecord, setSelectedRecord] = useState<Prediction | null>(null);
  const [doctorComment, setDoctorComment] = useState('');

  // Filtering Logic: Strict data segregation
  const filtered = predictions.filter(p => {
    // 1. Ownership Check
    if (currentUser?.role === 'User' && p.userId !== currentUser.id) return false;
    
    // 2. Assignment Check (Doctors only see what is assigned to them)
    if (currentUser?.role === 'Doctor' && p.reviewingDoctorId !== currentUser.id) return false;

    // 3. UI Filters
    const matchesSearch = p.patientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'All' || p.riskLevel === filter || p.status === filter;
    
    return matchesSearch && matchesFilter;
  });

  const handleReviewSubmit = () => {
    if (!selectedRecord) return;
    const updated: Prediction = {
      ...selectedRecord,
      status: 'Reviewed',
      doctorComment: doctorComment,
      reviewedAt: new Date().toLocaleDateString()
    };
    onUpdatePrediction(updated);
    setSelectedRecord(null);
    setDoctorComment('');
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={currentUser?.role === 'Doctor' ? "Search patient records..." : "Search my records..."}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none transition-all text-sm shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 overflow-x-auto w-full md:w-auto shadow-sm">
          {['All', 'Pending Review', 'Reviewed', RiskLevel.HIGH].map((r) => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`px-4 py-1.5 rounded-lg text-[10px] md:text-xs font-bold whitespace-nowrap transition-all ${
                filter === r ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length > 0 ? filtered.map((p) => {
          const doctor = INITIAL_DOCTORS.find(d => d.id === p.reviewingDoctorId);
          return (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-all p-5 md:p-6 group">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        p.riskLevel === RiskLevel.HIGH ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 leading-none mb-1">{p.patientName}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Case Reference: {p.id}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border tracking-widest ${
                      p.status === 'Reviewed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-4 gap-x-8 py-4 border-y border-slate-50">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-black mb-1 tracking-widest">AI Prediction</p>
                      <p className={`text-sm font-bold ${p.riskLevel === RiskLevel.HIGH ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {p.riskLevel} ({p.riskScore}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-black mb-1 tracking-widest">Reviewing Professional</p>
                      <p className="text-sm font-bold text-slate-900 truncate">{doctor?.name}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-black mb-1 tracking-widest">Intake Date</p>
                      <p className="text-sm font-bold text-slate-700">{p.date}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-black mb-1 tracking-widest">Details</p>
                      <p className="text-sm font-bold text-slate-700">{p.patientAge}Y • {p.patientSex}</p>
                    </div>
                  </div>

                  {p.doctorComment ? (
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                      <p className="text-[10px] font-black text-indigo-700 mb-1.5 flex items-center gap-1.5 uppercase tracking-widest">
                        <MessageSquare className="w-3 h-3" /> Professional Assessment
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed italic">"{p.doctorComment}"</p>
                      <div className="mt-3 pt-3 border-t border-indigo-100/50 flex justify-between items-center">
                         <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-tighter">Verified on {p.reviewedAt}</span>
                         <span className="text-[10px] text-indigo-400 font-medium">Digital Signature Valid</span>
                      </div>
                    </div>
                  ) : (
                    currentUser?.role === 'User' && (
                      <div className="text-center py-2">
                        <p className="text-xs text-slate-400 italic">Awaiting professional review from {doctor?.name}...</p>
                      </div>
                    )
                  )}
                </div>

                <div className="md:w-48 flex md:flex-col justify-end gap-2">
                  {currentUser?.role === 'Doctor' && p.status === 'Pending Review' ? (
                    <button 
                      onClick={() => setSelectedRecord(p)}
                      className="flex-1 w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Final Diagnosis
                    </button>
                  ) : (
                    <button className="flex-1 w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95">
                      <FileText className="w-4 h-4" /> Full Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center space-y-4 shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-slate-200" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-600 font-bold">No Records Found</p>
              <p className="text-slate-400 text-sm">Your diagnostic history will appear here once analysis is complete.</p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile-Friendly Doctor Review Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-end md:items-center justify-center z-[60] p-0 md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Medical Review</h3>
                <p className="text-xs text-slate-500 font-medium">Case: {selectedRecord.patientName} (#{selectedRecord.id})</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-slate-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-slate-400 rotate-45" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">AI Prediction Insight</p>
                <p className="text-xs text-slate-600 leading-relaxed italic">"{selectedRecord.reasoning}"</p>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700 flex justify-between items-center">
                   Professional Decision
                   <span className="text-[10px] text-slate-400 font-normal">Character count: {doctorComment.length}</span>
                </label>
                <textarea 
                  autoFocus
                  value={doctorComment}
                  onChange={(e) => setDoctorComment(e.target.value)}
                  className="w-full h-48 p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm resize-none"
                  placeholder="Review findings, recommend specific tests, and provide the patient with clear next steps..."
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50/50 flex gap-4 safe-area-bottom border-t border-slate-100">
              <button onClick={() => setSelectedRecord(null)} className="flex-1 py-4 text-slate-500 font-bold text-sm">Cancel</button>
              <button 
                onClick={handleReviewSubmit}
                disabled={!doctorComment.trim()}
                className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm disabled:opacity-30 shadow-xl shadow-slate-200 transition-transform active:scale-95"
              >
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
