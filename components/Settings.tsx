
import React from 'react';
import { User } from '../types';
import { UserCircle, Mail, Stethoscope, Shield, Trash2, Info } from 'lucide-react';

interface SettingsProps {
  currentUser: User;
  onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ currentUser, onLogout }) => {

  const handleClearData = () => {
    if (confirm('This will clear all your local data including predictions. Continue?')) {
      localStorage.clear();
      onLogout();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 lg:pb-0">
      {/* Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-5">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              currentUser.role === 'Doctor' ? 'bg-indigo-500/20' : 'bg-cyan-500/20'
            }`}>
              {currentUser.role === 'Doctor' 
                ? <Stethoscope className="w-8 h-8 text-indigo-300" />
                : <UserCircle className="w-8 h-8 text-cyan-300" />
              }
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">
                {currentUser.role === 'Doctor' ? `Dr. ${currentUser.name}` : currentUser.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                  currentUser.role === 'Doctor' ? 'bg-indigo-500/30 text-indigo-200' : 'bg-cyan-500/30 text-cyan-200'
                }`}>
                  {currentUser.role === 'Doctor' ? 'Medical Professional' : 'Patient'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
            <Mail className="w-5 h-5 text-slate-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Email</p>
              <p className="text-sm font-bold text-slate-900">{currentUser.email}</p>
            </div>
          </div>

          {currentUser.specialty && (
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <Stethoscope className="w-5 h-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Specialty</p>
                <p className="text-sm font-bold text-slate-900">{currentUser.specialty}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
            <Shield className="w-5 h-5 text-slate-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Account ID</p>
              <p className="text-sm font-bold text-slate-900 font-mono">{currentUser.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Info className="w-5 h-5 text-cyan-500" />
          <h3 className="font-bold text-slate-900">About This App</h3>
        </div>
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            <strong>GaucherPredict</strong> is a clinical decision-support tool developed as a 
            CSC499 Final Year Project at Kwara State University. It uses AI-powered analysis to 
            assist in early Gaucher Disease screening.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Version</p>
              <p className="font-bold text-slate-700">1.0.0</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Lead Engineer</p>
              <p className="font-bold text-slate-700">CHRISTTech</p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-3xl border border-rose-100 shadow-sm p-6">
        <h3 className="font-bold text-rose-600 text-sm mb-4 uppercase tracking-wider">Danger Zone</h3>
        <button
          onClick={handleClearData}
          className="w-full flex items-center justify-center gap-2 py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl font-bold text-sm transition-all active:scale-95 border border-rose-200"
        >
          <Trash2 className="w-4 h-4" />
          Clear All Local Data
        </button>
        <p className="text-[10px] text-slate-400 mt-3 text-center">
          This will remove all predictions and account data stored on this device.
        </p>
      </div>
    </div>
  );
};

export default Settings;
