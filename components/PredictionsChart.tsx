
import React, { useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Prediction } from '../types';
import { BarChart3 } from 'lucide-react';

interface PredictionsChartProps {
  predictions: Prediction[];
}

/**
 * Derives chart data from real predictions.
 * Groups by the `date` string (e.g. "Jun 5, 2026") and counts how many
 * predictions fall on each unique date, returning the last 30 unique dates.
 */
function buildChartData(predictions: Prediction[]) {
  const counts: Record<string, number> = {};

  for (const p of predictions) {
    counts[p.date] = (counts[p.date] ?? 0) + 1;
  }

  // Sort by actual date value, take last 30 entries
  const sorted = Object.entries(counts)
    .map(([date, count]) => ({ date, count, ts: new Date(date).getTime() }))
    .sort((a, b) => a.ts - b.ts)
    .slice(-30)
    .map(({ date, count }) => ({ day: date, predictions: count }));

  return sorted;
}

const PredictionsChart: React.FC<PredictionsChartProps> = ({ predictions }) => {
  const chartData = useMemo(() => buildChartData(predictions), [predictions]);

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm h-full flex flex-col items-center justify-center gap-3 text-center min-h-[200px]">
        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-slate-500 font-semibold text-sm">No Data Yet</p>
        <p className="text-slate-400 text-xs max-w-[160px]">
          Case activity will appear here once assessments are submitted.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm h-full">
      <h3 className="text-slate-900 font-semibold mb-1">Cases Over Time</h3>
      <p className="text-slate-400 text-xs mb-5">
        {chartData.length} active day{chartData.length !== 1 ? 's' : ''} · {predictions.length} total case{predictions.length !== 1 ? 's' : ''}
      </p>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.18}/>
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val: string) => {
                // Shorten long date strings to "Jun 5" style
                const d = new Date(val);
                return isNaN(d.getTime())
                  ? val
                  : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis
              hide={false}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={24}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontSize: '12px',
              }}
              formatter={(value: number) => [value, 'Cases']}
              labelFormatter={(label: string) => {
                const d = new Date(label);
                return isNaN(d.getTime())
                  ? label
                  : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
              }}
            />
            <Area
              type="monotone"
              dataKey="predictions"
              stroke="#06b6d4"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPred)"
              dot={{ r: 3, fill: '#06b6d4', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#06b6d4' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PredictionsChart;
