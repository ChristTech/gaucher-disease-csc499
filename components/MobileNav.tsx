
import React from 'react';
import { LayoutDashboard, FileEdit, Users, BarChart3, Settings } from 'lucide-react';
import { User } from '../types';

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: User | null;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onTabChange, currentUser }) => {
  const allItems = [
    { name: 'Dashboard', icon: LayoutDashboard, roles: ['User', 'Doctor'] },
    { name: 'New Prediction', icon: FileEdit, roles: ['User'] },
    { name: 'Patient Records', icon: Users, roles: ['User', 'Doctor'] },
    { name: 'Analytics', icon: BarChart3, roles: ['Doctor'] },
    { name: 'Settings', icon: Settings, roles: ['User', 'Doctor'] },
  ];

  const items = allItems.filter(item => item.roles.includes(currentUser?.role || 'User'));

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center px-2 py-3 z-50 safe-area-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.name;
        return (
          <button
            key={item.name}
            onClick={() => onTabChange(item.name)}
            className={`flex flex-col items-center gap-1 transition-all ${
              isActive ? 'text-cyan-600 scale-110' : 'text-slate-400'
            }`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{item.name.split(' ')[0]}</span>
          </button>
        );
      })}
    </div>
  );
};

export default MobileNav;
