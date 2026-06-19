
import React from 'react';
import { RiskLevel, Prediction, User } from '../types';
import { INITIAL_DOCTORS } from '../constants';

interface RecentPredictionsTableProps {
  currentUser: User | null;
  predictions: Prediction[];
}

const RecentPredictionsTable: React.FC<RecentPredictionsTableProps> = ({ currentUser, predictions }) => {
  const visible = predictions.filter(p => {
    if (currentUser?.role === 'User') return p.userId === currentUser.id;
    if (currentUser?.role === 'Doctor') return p.reviewingDoctorId === currentUser.id;
    return false;
  });
  
  const recent = visible.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
        <h3 className="text-slate-900 font-semibold">Diagnostic Activity</h3>
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{visible.length} Total Cases</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Patient</th>
              <th className="px-6 py-4">Reviewer</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">AI Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recent.length > 0 ? recent.map((p) => {
              const doctor = INITIAL_DOCTORS.find(d => d.id === p.reviewingDoctorId);
              return (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-900">{p.patientName}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-tight">{p.date}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-medium text-slate-700">{doctor?.name}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">{doctor?.specialty}</div>
                  </td>
                  <td className="px-6 py-4">
                     <span className={`text-[10px] font-bold uppercase flex items-center gap-1.5 ${
                       p.status === 'Reviewed' ? 'text-emerald-600' : 'text-amber-500'
                     }`}>
                       <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'Reviewed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                       {p.status}
                     </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      p.riskLevel === RiskLevel.HIGH 
                        ? 'bg-rose-50 text-rose-600' 
                        : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {p.riskLevel}
                    </span>
                  </td>
                </tr>
              )
            }) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm italic">
                  No diagnostic history found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentPredictionsTable;
