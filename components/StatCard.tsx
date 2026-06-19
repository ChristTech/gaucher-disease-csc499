
import React from 'react';
import { TrendingUp } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  trend?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, highlight, trend }) => {
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex-1 min-w-[240px]">
      <p className="text-slate-500 text-sm font-medium mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className={`text-4xl font-bold tracking-tight ${highlight ? 'text-rose-500' : 'text-slate-900'}`}>
          {value}
        </span>
        {trend && (
          <TrendingUp className="w-5 h-5 text-emerald-500" />
        )}
      </div>
    </div>
  );
};

export default StatCard;
