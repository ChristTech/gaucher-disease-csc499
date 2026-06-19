
import React from 'react';
import { 
  LayoutDashboard, 
  FileEdit, 
  Users, 
  BarChart3, 
  Settings, 
  UserCircle,
  Activity,
  LogOut,
  Stethoscope,
  GraduationCap
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, currentUser, onLogout }) => {
  const allNavItems = [
    { name: 'Dashboard', icon: LayoutDashboard, roles: ['User', 'Doctor'] },
    { name: 'New Prediction', icon: FileEdit, roles: ['User'] },
    { name: 'Patient Records', icon: Users, roles: ['User', 'Doctor'] },
    { name: 'Analytics', icon: BarChart3, roles: ['Doctor'] },
    { name: 'Settings', icon: Settings, roles: ['User', 'Doctor'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(currentUser?.role || 'User'));

  return (
    <div className="w-64 bg-[#112d3b] h-screen fixed left-0 top-0 flex flex-col text-slate-300 z-40">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-cyan-400 flex items-center justify-center">
          <Activity className="w-5 h-5 text-[#112d3b]" />
        </div>
        <span className="text-xl font-bold text-white">GaucherPredict</span>
      </div>

      <nav className="mt-8 flex-1 px-4">
        {navItems.map((item) => {
          const isActive = activeTab === item.name;
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              onClick={() => onTabChange(item.name)}
              className={`w-full flex items-center gap-4 px-4 py-3 mb-2 rounded-lg transition-all ${
                isActive 
                  ? 'bg-slate-700/50 text-white border-l-4 border-cyan-400' 
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700/50 bg-[#0d232e]">
        <div className="flex flex-col gap-2 px-2 py-3 rounded-lg text-[10px] leading-tight text-slate-400 font-medium">
          <div className="flex items-center gap-1.5 text-cyan-400 uppercase tracking-widest font-bold text-[9px] mb-1">
            <GraduationCap className="w-3 h-3" />
            Project Credits
          </div>
          <p>2026 CSC499 Final Year Project</p>
          <p className="text-slate-500">Kwara State University Students</p>
        </div>
      </div>

      <div className="p-4 mt-auto border-t border-slate-700 space-y-2">
        <div className="flex items-center gap-3 px-2 py-3 bg-slate-800/50 rounded-xl border border-slate-700">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
            {currentUser?.role === 'Doctor' ? (
              <Stethoscope className="w-6 h-6 text-indigo-400" />
            ) : (
              <UserCircle className="w-7 h-7" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{currentUser?.name}</p>
            <p className="text-xs text-slate-400 truncate">
              {currentUser?.role === 'Doctor' ? currentUser.specialty : 'Patient Portal'}
            </p>
          </div>
        </div>
        
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-rose-400 transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
