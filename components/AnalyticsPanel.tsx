
import React, { useState, useMemo } from 'react';
import { Activity } from '../types';
import { SUBJECTS, TRANSVERSAL_COMPETENCIES, SCHOOL_YEARS, GRADES, SUBJECT_ICONS } from '../constants';
import { 
  TrendingUp, 
  AlertCircle, 
  Target, 
  CheckCircle, 
  History,
  BarChart3,
  Award,
  Layers,
  Quote,
  Filter,
  ArrowUpRight
} from 'lucide-react';

interface AnalyticsPanelProps {
  activities: Activity[];
}

type AnalysisTab = 'distribucio' | 'competencies' | 'criteris' | 'sabers';

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ activities }) => {
  const [selectedYear, setSelectedYear] = useState<string>(SCHOOL_YEARS[0]);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<AnalysisTab>('distribucio');

  const allSubjects = useMemo(() => [...SUBJECTS, ...TRANSVERSAL_COMPETENCIES], []);

  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      const matchYear = (a.schoolYear || SCHOOL_YEARS[0]) === selectedYear;
      const matchGrade = selectedGrade === 'all' || a.grade === selectedGrade;
      const matchSubject = selectedSubjectId === 'all' || (a.subjectIds || []).includes(selectedSubjectId);
      return matchYear && matchGrade && matchSubject;
    });
  }, [activities, selectedYear, selectedGrade, selectedSubjectId]);

  const stats = useMemo(() => {
    const getStatsForType = (type: 'competencia' | 'criteri' | 'saber') => {
      const items = filteredActivities.flatMap(a => {
        let list = [];
        if (type === 'competencia') list = a.competencies || [];
        else if (type === 'criteri') list = a.criteria || [];
        else list = a.sabers || [];
        
        if (selectedSubjectId !== 'all') {
          return list.filter(item => item.subjectId === selectedSubjectId);
        }
        return list;
      });

      const counts: Record<string, number> = {};
      const texts: Record<string, string> = {};
      const itemSubjectIds: Record<string, string> = {};

      items.forEach(item => {
        const code = item.code.trim();
        counts[code] = (counts[code] || 0) + 1;
        if (!texts[code]) texts[code] = item.text;
        if (!itemSubjectIds[code] && item.subjectId) itemSubjectIds[code] = item.subjectId;
      });

      return Object.keys(counts)
        .map(code => ({ 
          code, 
          count: counts[code] || 0, 
          text: texts[code], 
          subjectId: itemSubjectIds[code],
          percentage: filteredActivities.length > 0 ? (((counts[code] || 0) / filteredActivities.length) * 100).toFixed(0) : "0"
        }))
        .sort((a, b) => (b.count || 0) - (a.count || 0));
    };

    const areaCounts: Record<string, number> = {};
    const baseActivitiesForAreas = activities.filter(a => {
      const matchYear = (a.schoolYear || SCHOOL_YEARS[0]) === selectedYear;
      const matchGrade = selectedGrade === 'all' || a.grade === selectedGrade;
      return matchYear && matchGrade;
    });

    baseActivitiesForAreas.forEach(a => {
      (a.subjectIds || []).forEach(id => {
        areaCounts[id] = (areaCounts[id] || 0) + 1;
      });
    });

    return {
      total: filteredActivities.length,
      competencies: getStatsForType('competencia'),
      criteris: getStatsForType('criteri'),
      sabers: getStatsForType('saber'),
      areas: areaCounts
    };
  }, [activities, filteredActivities, selectedYear, selectedGrade, selectedSubjectId]);

  const getAreaColor = (subjectId?: string) => {
    if (!subjectId) return 'blue';
    const area = allSubjects.find(s => s.id === subjectId);
    return area?.color || 'blue';
  };

  const renderRanking = (data: any[], typeLabel: string) => {
    const top = data.slice(0, 10);
    if (top.length === 0) return (
      <div className="bg-slate-50/50 rounded-[2.5rem] p-20 text-center border-2 border-dashed border-slate-100 flex flex-col items-center">
        <AlertCircle size={40} className="text-slate-300 mb-4" />
        <p className="text-slate-400 font-black uppercase text-xs tracking-widest">
          No s'han trobat dades per a aquest rànquing.
        </p>
      </div>
    );

    return (
      <div className="grid grid-cols-1 gap-6 animate-fade-in">
        {top.map((item, i) => {
          const areaColor = getAreaColor(item.subjectId);
          
          return (
            <div key={item.code} className="group bg-white border border-slate-100 rounded-[2rem] p-6 hover:border-blue-200 hover:shadow-xl transition-all duration-300 flex flex-col md:flex-row gap-8 items-center overflow-hidden relative">
              <div className={`absolute left-0 top-0 h-full w-1.5 bg-${areaColor}-600`}></div>
              
              <div className="shrink-0 flex items-center gap-6">
                <div className={`w-12 h-12 rounded-xl bg-${areaColor}-600 text-white flex items-center justify-center font-black text-lg shadow-md group-hover:scale-110 transition-transform`}>
                  {i + 1}
                </div>
                <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex flex-col items-center min-w-[70px]">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Freq.</span>
                  <span className={`text-sm font-black text-${areaColor}-600`}>{item.percentage}%</span>
                </div>
              </div>

              <div className="flex-grow space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-${areaColor}-100 text-${areaColor}-700 border border-${areaColor}-200`}>
                    {typeLabel}
                  </span>
                  <span className="text-[10px] font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                    {item.code}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 ml-auto">
                    <History size={10} /> {item.count} Situacions
                  </span>
                </div>

                <div className="relative">
                  <Quote size={20} className="absolute -top-2 -left-4 text-slate-50 -z-10" />
                  <p className="text-slate-800 font-bold leading-relaxed text-sm">
                    {item.text}
                  </p>
                </div>

                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-${areaColor}-600 transition-all duration-1000`} 
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDistributionChart = () => {
    const areaStats = Object.entries(stats.areas).sort((a, b) => ((b[1] as number) || 0) - ((a[1] as number) || 0));
    if (areaStats.length === 0) return (
        <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">
            Crea SAs per veure la distribució per àrees
        </div>
    );

    const maxCount = Math.max(...areaStats.map(a => a[1] as number));

    return (
      <div className="space-y-10 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-8 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-600" /> Pes de les Àrees Curriculars
            </h4>
            <div className="space-y-4">
              {areaStats.map(([id, count]) => {
                const sub = allSubjects.find(s => s.id === id);
                const percentage = ((count as number) / (maxCount || 1)) * 100;
                const isSelected = selectedSubjectId === id;
                return (
                  <button 
                    key={id} 
                    onClick={() => setSelectedSubjectId(id)}
                    className={`w-full group text-left transition-all p-2 rounded-2xl ${isSelected ? 'bg-slate-50 shadow-sm border border-slate-100' : 'hover:bg-slate-50/50'}`}
                  >
                    <div className="flex justify-between items-center mb-2 px-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-${sub?.color || 'blue'}-600 text-white flex items-center justify-center shadow-sm`}>
                            {SUBJECT_ICONS[id] || <Award size={14} />}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-blue-600' : 'text-slate-600'}`}>
                            {sub?.name.split(' (')[0]}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-slate-900 bg-white px-3 py-1 rounded-full border border-slate-100">{count} SAs</span>
                    </div>
                    <div className="h-5 w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-50 relative">
                      <div 
                        className={`h-full bg-${sub?.color || 'blue'}-600 transition-all duration-1000 shadow-md relative`}
                        style={{ width: `${percentage}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-4 flex flex-col gap-6">
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex flex-col justify-center relative overflow-hidden flex-1 shadow-2xl">
                <div className="absolute -bottom-10 -right-10 p-8 opacity-5 rotate-12 scale-150">
                <Target size={200} />
                </div>
                <h4 className="text-2xl font-black mb-6 tracking-tight">Equilibri del Curs</h4>
                <div className="space-y-6">
                    <div className="flex items-center gap-5">
                        <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg border border-blue-400">
                            {Object.keys(stats.areas).length}
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 block">Àrees Actives</span>
                            <span className="text-slate-400 text-xs font-bold">Cobertura global de la programació.</span>
                        </div>
                    </div>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed italic border-l-2 border-slate-700 pl-4 py-1">
                    {Object.keys(stats.areas).length > 6 
                        ? "La programació mostra una gran riquesa interdisciplinària." 
                        : "Programació amb un enfocament disciplinari clar."}
                    </p>
                </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-lg flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                    <Award size={32} />
                </div>
                <span className="text-4xl font-black text-slate-900">{stats.total}</span>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Projectes Analitzats</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto py-10 animate-fade-in space-y-10 px-4">
      {/* Capçalera i Filtres */}
      <div className="bg-white p-8 rounded-[3rem] border border-blue-50 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl"><BarChart3 size={24} /></div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Arquitectura Curricular</h2>
            <p className="text-slate-500 font-bold mt-2">Pes relatiu i dominància dels elements del Decret.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Curs</label>
            <select 
              value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-3 font-black text-[11px] uppercase tracking-widest outline-none focus:border-blue-400 transition-all cursor-pointer min-w-[130px]"
            >
              {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Nivell</label>
            <select 
              value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-3 font-black text-[11px] uppercase tracking-widest outline-none focus:border-blue-400 transition-all cursor-pointer min-w-[150px]"
            >
              <option value="all">Primària Completa</option>
              {GRADES.map(g => <option key={g} value={g}>{g} de Primària</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-blue-600 ml-2">Filtrar Àrea</label>
            <select 
              value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)}
              className={`bg-white border-2 rounded-2xl px-6 py-3 font-black text-[11px] uppercase tracking-widest outline-none transition-all cursor-pointer min-w-[180px] ${selectedSubjectId !== 'all' ? 'border-blue-400 text-blue-600' : 'border-slate-100 text-slate-500'}`}
            >
              <option value="all">Totes les àrees</option>
              {allSubjects.map(s => <option key={s.id} value={s.id}>{s.name.split(' (')[0]}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Indicadors KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Elements Curriculars', value: stats.competencies.length + stats.criteris.length + stats.sabers.length, icon: Layers, color: 'blue' },
          { label: 'Freq. Mitjana Sabers', value: stats.total > 0 ? (stats.sabers.reduce((acc, curr) => acc + (curr.count || 0), 0) / (stats.sabers.length || 1)).toFixed(1) : 0, icon: TrendingUp, color: 'indigo' },
          { label: 'Criteris d\'Avaluació', value: stats.criteris.length, icon: CheckCircle, color: 'sky' },
          { label: 'Competències Espec.', value: stats.competencies.length, icon: Target, color: 'emerald' }
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:-translate-y-1 transition-all">
            <div className={`p-4 bg-${kpi.color}-50 text-${kpi.color}-600 rounded-2xl mb-4 group-hover:scale-110 transition-transform`}>
              <kpi.icon size={24} />
            </div>
            <span className="text-3xl font-black text-slate-900">{kpi.value}</span>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">{kpi.label}</span>
          </div>
        ))}
      </div>

      {/* Secció de Resultats Detallats */}
      <div className="bg-white rounded-[4rem] border border-blue-50 shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h3 className="text-3xl font-black text-white tracking-tight">Mapa d'Impacte</h3>
            <p className="text-slate-400 font-bold mt-2">
              Explora els elements més rellevants {selectedSubjectId !== 'all' ? `de l'àrea seleccionada` : 'del curs'}.
            </p>
          </div>
          <div className="flex bg-white/10 p-2 rounded-2xl gap-2 overflow-x-auto max-w-full">
            {[
              { id: 'distribucio', label: 'Distribució', icon: <Target size={16} /> },
              { id: 'competencies', label: 'Competències', icon: <Target size={16} /> },
              { id: 'criteris', label: 'Criteris', icon: <CheckCircle size={16} /> },
              { id: 'sabers', label: 'Sabers', icon: <History size={16} /> }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveAnalysisTab(tab.id as AnalysisTab)}
                className={`flex items-center gap-3 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeAnalysisTab === tab.id ? 'bg-white text-slate-900 shadow-xl' : 'text-white/60 hover:text-white'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-12 min-h-[500px]">
          {activeAnalysisTab === 'distribucio' && renderDistributionChart()}
          {activeAnalysisTab === 'competencies' && renderRanking(stats.competencies, 'Competència')}
          {activeAnalysisTab === 'criteris' && renderRanking(stats.criteris, 'Criteri')}
          {activeAnalysisTab === 'sabers' && renderRanking(stats.sabers, 'Saber')}
        </div>
      </div>
      
      <div className="flex justify-center pt-10">
         <button 
          onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}
          className="bg-slate-900 text-white px-12 py-6 rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-2xl flex items-center gap-4 hover:bg-black transition-all active:scale-95 border-2 border-slate-800"
         >
           Tornar a la Programació <ArrowUpRight size={20} />
         </button>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
