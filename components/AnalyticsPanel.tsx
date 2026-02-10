
import React, { useState, useMemo } from 'react';
import { Activity } from '../types';
import { SUBJECTS, TRANSVERSAL_COMPETENCIES, SCHOOL_YEARS, GRADES, SUBJECT_ICONS } from '../constants';
import { 
  TrendingUp, 
  AlertCircle, 
  Target, 
  CheckCircle, 
  History,
  PieChart,
  Activity as ActivityIcon,
  Calendar,
  ChevronRight,
  BarChart3,
  Award,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface AnalyticsPanelProps {
  activities: Activity[];
}

type AnalysisTab = 'distribucio' | 'competencies' | 'criteris' | 'sabers' | 'temporalitat';

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ activities }) => {
  const [selectedYear, setSelectedYear] = useState<string>(SCHOOL_YEARS[0]);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<AnalysisTab>('distribucio');

  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      const matchYear = (a.schoolYear || SCHOOL_YEARS[0]) === selectedYear;
      const matchGrade = selectedGrade === 'all' || a.grade === selectedGrade;
      return matchYear && matchGrade;
    });
  }, [activities, selectedYear, selectedGrade]);

  const stats = useMemo(() => {
    const getStatsForType = (type: 'competencia' | 'criteri' | 'saber') => {
      const items = filteredActivities.flatMap(a => {
        if (type === 'competencia') return a.competencies || [];
        if (type === 'criteri') return a.criteria || [];
        return a.sabers || [];
      });

      const counts: Record<string, number> = {};
      const texts: Record<string, string> = {};

      items.forEach(item => {
        const code = item.code.trim();
        counts[code] = (counts[code] || 0) + 1;
        if (!texts[code]) texts[code] = item.text;
      });

      return Object.keys(counts)
        .map(code => ({ code, count: counts[code], text: texts[code] }))
        .sort((a, b) => b.count - a.count);
    };

    // Distribució per àrees
    const areaCounts: Record<string, number> = {};
    filteredActivities.forEach(a => {
      (a.subjectIds || []).forEach(id => {
        areaCounts[id] = (areaCounts[id] || 0) + 1;
      });
    });

    const monthCounts: Record<string, number> = {
      '09': 0, '10': 0, '11': 0, '12': 0, '01': 0, '02': 0, '03': 0, '04': 0, '05': 0, '06': 0
    };
    
    filteredActivities.forEach(a => {
      const date = new Date(a.createdAt);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      if (monthCounts[month] !== undefined) monthCounts[month]++;
    });

    return {
      total: filteredActivities.length,
      competencies: getStatsForType('competencia'),
      criteris: getStatsForType('criteri'),
      sabers: getStatsForType('saber'),
      areas: areaCounts,
      temporal: monthCounts
    };
  }, [filteredActivities]);

  // Donut Chart per a la distribució d'àrees
  const renderDonutChart = () => {
    // Fix: Cast values to number array to ensure correct reduction and avoid 'unknown' operator error.
    const totalAreas = (Object.values(stats.areas) as number[]).reduce((a, b) => a + b, 0) || 1;
    let currentPercent = 0;
    // Fix: Added explicit numeric type cast in the sort comparator to fix potential subtraction error.
    const entries = Object.entries(stats.areas).sort((a, b) => (b[1] as number) - (a[1] as number));

    return (
      <div className="flex flex-col md:flex-row items-center gap-12 bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm animate-fade-in">
        <div className="relative w-64 h-64 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {entries.length === 0 ? (
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
            ) : (
              entries.map(([id, count], i) => {
                // Fix: Cast count to number for division operation to avoid arithmetic type error.
                const percent = ((count as number) / totalAreas) * 100;
                const dashArray = `${percent} ${100 - percent}`;
                const dashOffset = -currentPercent;
                currentPercent += percent;
                const colors = ['#2563eb', '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
                return (
                  <circle
                    key={id}
                    cx="50" cy="50" r="40"
                    fill="transparent"
                    stroke={colors[i % colors.length]}
                    strokeWidth="12"
                    strokeDasharray={`${percent} 100`}
                    strokeDashoffset={dashOffset}
                    className="transition-all duration-1000 ease-out"
                  />
                );
              })
            )}
            <circle cx="50" cy="50" r="28" fill="white" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-slate-900">{stats.total}</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Projectes</span>
          </div>
        </div>

        <div className="flex-grow space-y-4">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Pes de les Àrees</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {entries.length > 0 ? entries.map(([id, count], i) => {
              const subject = [...SUBJECTS, ...TRANSVERSAL_COMPETENCIES].find(s => s.id === id);
              const colors = ['bg-blue-600', 'bg-sky-500', 'bg-indigo-500', 'bg-violet-500', 'bg-pink-500', 'bg-amber-500', 'bg-emerald-500'];
              return (
                <div key={id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-3 h-3 rounded-full ${colors[i % colors.length]} shrink-0`} />
                    <span className="text-[10px] font-bold text-slate-600 truncate">{subject?.name || id}</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">{count}</span>
                </div>
              );
            }) : (
              <p className="text-slate-400 font-bold italic text-sm">Crea la teva primera SA per veure la distribució.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Area Chart per a la temporalitat
  const renderAreaChart = () => {
    const months = Object.keys(stats.temporal);
    const maxVal = Math.max(...(Object.values(stats.temporal) as number[]), 1);
    const monthNames = ['Set', 'Oct', 'Nov', 'Des', 'Gen', 'Feb', 'Mar', 'Abr', 'Maig', 'Jun'];
    
    // Generar punts per al gràfic d'àrea SVG
    const points = months.map((m, i) => {
      const x = (i / (months.length - 1)) * 100;
      const y = 100 - (stats.temporal[m] / maxVal) * 80;
      return `${x},${y}`;
    }).join(' ');

    const areaPath = `0,100 ${points} 100,100`;

    return (
      <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm animate-fade-in">
        <div className="flex justify-between items-center mb-10">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2"><Calendar size={14} className="text-blue-600" /> Flux de Càrrega Docent</h4>
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full uppercase tracking-widest">Trimestres 1-3</span>
        </div>
        
        <div className="relative h-64 w-full">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid */}
            {[0, 25, 50, 75, 100].map(v => (
              <line key={v} x1="0" y1={v} x2="100" y2={v} stroke="#f1f5f9" strokeWidth="0.5" />
            ))}
            
            {/* Area */}
            <polyline points={areaPath} fill="url(#areaGradient)" />
            <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />
            
            {/* Punts */}
            {months.map((m, i) => {
              const x = (i / (months.length - 1)) * 100;
              const y = 100 - (stats.temporal[m] / maxVal) * 80;
              return (
                <circle key={m} cx={x} cy={y} r="1.5" fill="#2563eb" className="hover:r-3 transition-all cursor-pointer" />
              );
            })}
          </svg>
        </div>
        
        <div className="flex justify-between mt-6 px-2">
          {monthNames.map(m => (
            <span key={m} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m}</span>
          ))}
        </div>
      </div>
    );
  };

  const renderRanking = (data: any[], title: string, color: string) => {
    const top = data.slice(0, 5);
    if (top.length === 0) return (
      <div className="bg-slate-50/50 rounded-[2.5rem] p-10 text-center border-2 border-dashed border-slate-100">
        <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest">Sense dades d'impacte</p>
      </div>
    );

    return (
      <div className="space-y-4">
        {top.map((item, i) => (
          <div key={item.code} className="group flex items-start gap-4 p-5 bg-white border border-slate-50 rounded-2xl hover:border-blue-100 hover:shadow-md transition-all">
            <div className={`w-8 h-8 rounded-xl ${color} text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm`}>
              {i + 1}
            </div>
            <div className="flex-grow">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{item.code}</span>
                <span className="text-sm font-black text-slate-900">{item.count} <span className="text-[9px] text-slate-300 uppercase">tasts</span></span>
              </div>
              <p className="text-xs font-bold text-slate-600 line-clamp-1 italic">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-[1200px] mx-auto py-10 animate-fade-in space-y-12">
      {/* Filtres Superiors */}
      <div className="bg-white p-8 rounded-[3rem] border border-blue-50 shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl"><BarChart3 size={24} /></div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Panell d'Impacte</h2>
            <p className="text-slate-500 font-bold">Anàlisi de l'arquitectura del teu curs.</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <select 
            value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-3 font-black text-[11px] uppercase tracking-widest outline-none focus:border-blue-400 transition-all appearance-none cursor-pointer"
          >
            {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select 
            value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}
            className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-3 font-black text-[11px] uppercase tracking-widest outline-none focus:border-blue-400 transition-all appearance-none cursor-pointer"
          >
            <option value="all">Tota la Primària</option>
            {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* Indicadors Principals (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Elements Únics', value: stats.competencies.length + stats.criteris.length + stats.sabers.length, icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Taxa de Repetició', value: stats.total > 0 ? (stats.sabers.reduce((a, b) => a + b.count, 0) / stats.sabers.length || 0).toFixed(1) : 0, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Àrees Tocades', value: Object.keys(stats.areas).length, icon: Target, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'Intensitat mitjana', value: stats.total > 0 ? (stats.total / 10).toFixed(1) : 0, icon: ActivityIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' }
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center group">
            <div className={`p-4 ${kpi.bg} ${kpi.color} rounded-2xl mb-4 group-hover:scale-110 transition-transform`}>
              <kpi.icon size={24} />
            </div>
            <span className="text-3xl font-black text-slate-900">{kpi.value}</span>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">{kpi.label}</span>
          </div>
        ))}
      </div>

      {/* Contingut Principal: Distribució i Temporalitat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {renderDonutChart()}
        {renderAreaChart()}
      </div>

      {/* Top Rànquings d'Impacte */}
      <div className="bg-white rounded-[3.5rem] border border-blue-50 shadow-xl overflow-hidden">
        <div className="flex border-b border-slate-100 bg-slate-50/50 p-4 gap-3 overflow-x-auto">
          {[
            { id: 'distribucio', label: 'Rànquing Impacte', icon: <Award size={16} /> },
            { id: 'competencies', label: 'Competències Top', icon: <Target size={16} /> },
            { id: 'criteris', label: 'Criteris Clau', icon: <CheckCircle size={16} /> },
            { id: 'sabers', label: 'Sabers Protagonistes', icon: <History size={16} /> }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveAnalysisTab(tab.id as AnalysisTab)}
              className={`flex-1 min-w-[180px] py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${activeAnalysisTab === tab.id ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="p-12">
          {activeAnalysisTab === 'distribucio' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg w-fit">Top Competències</h4>
                {renderRanking(stats.competencies, 'Competències', 'bg-blue-600')}
              </div>
              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-sky-600 bg-sky-50 px-3 py-1.5 rounded-lg w-fit">Top Criteris</h4>
                {renderRanking(stats.criteris, 'Criteris', 'bg-sky-500')}
              </div>
              <div className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg w-fit">Top Sabers</h4>
                {renderRanking(stats.sabers, 'Sabers', 'bg-indigo-500')}
              </div>
            </div>
          )}
          {activeAnalysisTab === 'competencies' && renderRanking(stats.competencies, 'Competències', 'bg-blue-600')}
          {activeAnalysisTab === 'criteris' && renderRanking(stats.criteris, 'Criteris', 'bg-sky-500')}
          {activeAnalysisTab === 'sabers' && renderRanking(stats.sabers, 'Sabers', 'bg-indigo-500')}
        </div>
      </div>

      {/* Footer Informatiu */}
      <div className="bg-slate-900 p-12 rounded-[3.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000">
          <ActivityIcon size={180} />
        </div>
        <div className="relative z-10">
          <h5 className="text-2xl font-black tracking-tight mb-2">Conclusió de l'Analítica</h5>
          <p className="text-slate-400 font-bold max-w-xl leading-relaxed">
            {stats.total === 0 
              ? "Encara no hi ha dades per analitzar. Comença a programar per veure com evoluciona el teu curs." 
              // Fix: Added explicit numeric type casts for entries sorting to fix arithmetic operand type error.
              : `Has cobert ${stats.competencies.length} competències diferents en ${stats.total} projectes. La teva àrea amb més presència és "${[...SUBJECTS, ...TRANSVERSAL_COMPETENCIES].find(s => s.id === Object.entries(stats.areas).sort((a,b)=>(b[1] as number)-(a[1] as number))[0]?.[0])?.name || '---'}".`}
          </p>
        </div>
        <button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="bg-white text-slate-900 px-10 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-3 hover:bg-blue-50 transition-all active:scale-95 relative z-10">
          Tornar a dalt <ArrowUpRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
