
import React, { useState } from 'react';
import { User as UserIcon, Activity, Stethoscope, Mail, Lock, ChevronRight, Shield } from 'lucide-react';
import { User, Role } from '../types';
import { INITIAL_DOCTORS } from '../constants';

interface AuthPortalProps {
  onRegister: (user: User) => void;
  onLogin: (user: User) => void;
}

const AuthPortal: React.FC<AuthPortalProps> = ({ onRegister, onLogin }) => {
  const [role, setRole] = useState<Role>('User');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    specialty: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      email: formData.email,
      role: role,
      specialty: role === 'Doctor' ? formData.specialty : undefined,
    };
    onRegister(newUser);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <div className="lg:w-1/2 bg-[#112d3b] p-12 flex flex-col justify-between text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-cyan-400 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-indigo-500 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-full bg-cyan-400 flex items-center justify-center">
              <Activity className="w-6 h-6 text-[#112d3b]" />
            </div>
            <span className="text-2xl font-bold">GaucherPredict</span>
          </div>
          <h1 className="text-5xl font-black mb-6 leading-tight">
            Advanced ML for <br />
            <span className="text-cyan-400">Gaucher Disease</span> <br />
            Diagnostics.
          </h1>
          <p className="text-xl text-slate-400 max-w-md">
            Empowering Kwara State University medical research with high-accuracy clinical predictions and AI-driven insights.
          </p>
        </div>

        <div className="relative z-10 text-slate-500 text-sm">
          © 2026 CSC499 Project • Kwara State University. Clinical use only.
        </div>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-24 bg-white overflow-y-auto">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Access Portal</h2>
          <p className="text-slate-500 mb-8">Select your role to continue to the diagnostic dashboard.</p>

          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setRole('User')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                role === 'User' ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-100 hover:border-slate-200 text-slate-500'
              }`}
            >
              <UserIcon className="w-6 h-6" />
              <span className="font-bold">Patient</span>
            </button>
            <button
              onClick={() => setRole('Doctor')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                role === 'Doctor' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-200 text-slate-500'
              }`}
            >
              <Stethoscope className="w-6 h-6" />
              <span className="font-bold">Medical Professional</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  required
                  type="text"
                  placeholder="Enter your name"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  required
                  type="email"
                  placeholder="name@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {role === 'Doctor' && (
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Medical Specialty</label>
                <div className="relative">
                  <Stethoscope className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    required
                    type="text"
                    placeholder="e.g. Hematology"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-4 mt-6 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                role === 'Doctor' ? 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700' : 'bg-cyan-600 shadow-cyan-200 hover:bg-cyan-700'
              }`}
            >
              Enter Dashboard
              <ChevronRight className="w-5 h-5" />
            </button>
          </form>

          {/* Built-in Doctor Login Section */}
          <div className="mt-10 pt-8 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Medical Staff Login</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">Authorized clinicians can access the review portal directly.</p>
            <div className="space-y-3">
              {INITIAL_DOCTORS.map((doctor) => (
                <button
                  key={doctor.id}
                  onClick={() => onLogin(doctor)}
                  className="w-full flex items-center gap-4 p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all group active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-200 transition-colors">
                    <Stethoscope className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{doctor.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{doctor.specialty}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPortal;
