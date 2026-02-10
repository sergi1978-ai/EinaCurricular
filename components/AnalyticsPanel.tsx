
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
  ArrowUpRight,
  Info,
  Quote,
  Zap,
  Star,
  Filter
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
        
        // Si hem filtrat per àrea, només agafem els elements d'aquella àrea
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
          count: counts[code], 
          text: texts[code], 
          subjectId: itemSubjectIds[code],
          percentage: filteredActivities.length > 0 ? ((counts[code] / filteredActivities.length) * 100).toFixed(0) : "0"
        }))
        .sort((a, b) => b.count - a.count);
    };

    const areaCounts: Record<string, number> = {};
    // Comptem àrees basant-nos en les activitats filtrades (sense el filtre d'àrea propi per poder veure la comparativa)
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

  const getPedagogicalJustification = (count: number, type: string) => {
    const isFiltered = selectedSubjectId !== 'all';
    const areaName = isFiltered ? allSubjects.find(s => s.id === selectedSubjectId)?.name.split(' (')[0] : "";

    if (count >= 4) {
      return {
        label: "Element Pilar",
        desc: isFiltered 
          ? `Aquest element és un eix fonamental de ${areaName}. Defineix la línia mestra de la teva intervenció en aquesta disciplina.`
          : "Aquest element és un eix transversal de la teva programació. Garanteix la continuïtat i profunditat dels aprenentatges clau del curs.",
        icon: <Star size={14} className="text-amber-600" />,
        bgColor: "bg-amber-50",
        textColor: "text-amber-900"
      };
    } else if (count >= 2) {
      return {
        label: "Consolidació Intermèdia",
        desc: "S'utilitza de forma recurrent per reforçar habilitats que requereixen pràctica en diferents contextos pedagògics.",
        icon: <TrendingUp size={14} className="text-blue-600" />,
        bgColor: "bg-blue-50",
        textColor: "text-blue-900"
      };
    } else {
      return {
        label: "Aprenentatge Específic",
        desc: "Element focalitzat en reptes puntuals. Afegeix valor i especificitat a Situacions d'Aprenentatge concretes.",
        icon: <Zap size={14} className="text-indigo-600" />,
        bgColor: "bg-indigo-50",
        textColor: "text-indigo-900"
      };
    }
  };

  const renderRanking = (data: any[], typeLabel: string) => {
    const top = data.slice(0, 10);
    if (top.length === 0) return (
      <div className="bg-slate-50/50 rounded-[2.5rem] p-20 text-center border-2 border-dashed border-slate-100 flex flex-col items-center">
        <AlertCircle size={40} className="text-slate-300 mb-4" />
        <p className="text-slate-400 font-black uppercase text-xs tracking-widest">
          {selectedSubjectId !== 'all' 
            ? `No s'han trobat ${typeLabel.toLowerCase()}s per a l'àrea seleccionada.` 
            : "Encara no hi ha prou dades per analitzar l'impacte d'aquesta secció."}
        </p>
      </div>
    );

    return (
      <div className="grid grid-cols-1 gap-8 animate-fade-in">
        {top.map((item, i) => {
          const areaColor = getAreaColor(item.subjectId);
          const justification = getPedagogicalJustification(item.count, typeLabel);
          
          return (
            <div key={item.code} className="group relative bg-white border border-slate-100 rounded-[2.5rem] p-8 hover:border-blue-200 hover:shadow-2xl transition-all duration-500 overflow-hidden">
              <div className={`absolute top-0 right-0 w-2 h-full bg-${areaColor}-600 opacity-20`}></div>
              
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-2xl bg-${areaColor}-600 text-white flex items-center justify-center font-black text-2xl shadow-lg group-hover:rotate-6 transition-transform`}>
                    {i + 1}
                  </div>
                  <div className="mt-4 flex flex-col items-center bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pes Real</span>
                    <span className={`text-xl font-black text-${areaColor}-600`}>{item.percentage}%</span>
                  </div>
                </div>

                <div className="flex-grow space-y-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-${areaColor}-600 text-white shadow-sm`}>
                      {typeLabel}
                    </span>
                    <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                      {item.code}
                    </span>
                    <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-2">
                      <Layers size={14} className="text-slate-400" /> Present en <span className="text-slate-900 font-black">{item.count}</span> Situacions
                    </span>
                  </div>

                  <div className="relative pl-4 border-l-4 border-slate-50">
                    <Quote size={24} className="absolute -top-3 -left-6 text-slate-100 -z-10" />
                    <p className="text-slate-800 font-bold leading-relaxed text-sm">
                      {item.text}
                    </p>
                  </div>

                  <div className={`p-6 rounded-3xl ${justification.bgColor} border border-current/5 space-y-3`}>
                    <div className="flex items-center gap-2">
                      {justification.icon}
                      <span className={`text-[10px] font-black uppercase tracking-widest ${justification.textColor}`}>
                        {justification.label}
                      </span>
                    </div>
                    <p className={`text-xs font-medium leading-relaxed opacity-80 ${justification.textColor}`}>
                      {justification.desc}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto py-10 animate-fade-in space-y-12 px-4">
      {/* Filtres Superiors */}
      <div className="bg-white p-8 rounded-[3rem] border border-blue-50 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl"><BarChart3 size={24} /></div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Arquitectura Curricular</h2>
            <p className="text-slate-500 font-bold">Anàlisi d'impacte i recurrència pedagògica per àrees.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Curs escolar</label>
            <select 
              value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-3 font-black text-[11px] uppercase tracking-widest outline-none focus:border-blue-400 transition-all appearance-none cursor-pointer min-w-[140px]"
            >
              {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Nivell</label>
            <select 
              value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-3 font-black text-[11px] uppercase tracking-widest outline-none focus:border-blue-400 transition-all appearance-none cursor-pointer min-w-[140px]"
            >
              <option value="all">Tota la Primària</option>
              {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-blue-600 ml-2 flex items-center gap-1">
              <Filter size={10} /> Filtrar per Àrea
            </label>
            <select 
              value={selectedSubjectId} onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                // Si l'usuari tria una àrea i està a la pestanya de distribució, potser vol veure competències
                if (e.target.value !== 'all' && activeAnalysisTab === 'distribucio') {
                  setActiveAnalysisTab('competencies');
                }
              }}
              className={`bg-white border-2 rounded-2xl px-6 py-3 font-black text-[11px] uppercase tracking-widest outline-none transition-all appearance-none cursor-pointer min-w-[180px] shadow-sm ${selectedSubjectId !== 'all' ? 'border-blue-400 text-blue-600' : 'border-slate-100 text-slate-500'}`}
            >
              <option value="all">Totes les àrees</option>
              {allSubjects.map(s => <option key={s.id} value={s.id}>{s.name.split(' (')[0]}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Indicadors Principals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Elements Únics', value: stats.competencies.length + stats.criteris.length + stats.sabers.length, icon: Layers, color: 'blue' },
          { label: 'Freqüència Mitjana', value: stats.total > 0 ? (stats.sabers.reduce((a, b) => a + b.count, 0) / (stats.sabers.length || 1)).toFixed(1) : 0, icon: TrendingUp, color: 'indigo' },
          { label: 'Àrees Treballades', value: Object.keys(stats.areas).length, icon: Target, color: 'sky' },
          { label: selectedSubjectId === 'all' ? 'Projectes Totals' : `Projectes de l'Àrea`, value: stats.total, icon: Award, color: 'emerald' }
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

      {/* Secció de Rànquing Enriquit */}
      <div className="bg-white rounded-[4rem] border border-blue-50 shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h3 className="text-3xl font-black text-white tracking-tight">
              {selectedSubjectId === 'all' ? 'Mapa de Freqüència Curricular' : `Anàlisi de l'Àrea`}
            </h3>
            <p className="text-slate-400 font-bold mt-1">
              {selectedSubjectId === 'all' 
                ? 'Identifica els elements vertebradors de la teva programació anual.' 
                : `Explorant la recurrència en l'àrea de ${allSubjects.find(s => s.id === selectedSubjectId)?.name.split(' (')[0]}.`}
            </p>
          </div>
          <div className="flex bg-white/10 p-2 rounded-2xl gap-2 overflow-x-auto max-w-full">
            {[
              { id: 'distribucio', label: 'Àrees', icon: <Target size={16} /> },
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

        <div className="p-12">
          {activeAnalysisTab === 'distribucio' && (
            <div className="space-y-12 animate-fade-in">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(stats.areas).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([id, count]) => {
                  const sub = allSubjects.find(s => s.id === id);
                  const isCurrent = selectedSubjectId === id;
                  return (
                    <button 
                      key={id} 
                      onClick={() => setSelectedSubjectId(id)}
                      className={`p-8 rounded-[2.5rem] border flex items-center justify-between group transition-all text-left ${isCurrent ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-105' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-xl'}`}
                    >
                      <div className="flex items-center gap-5">
                        <div className={`p-4 rounded-2xl shadow-lg group-hover:rotate-6 transition-transform ${isCurrent ? 'bg-white text-blue-600' : `bg-${sub?.color || 'blue'}-600 text-white`}`}>
                          {SUBJECT_ICONS[id] || <Award size={24} />}
                        </div>
                        <span className={`font-black text-sm leading-tight max-w-[150px] ${isCurrent ? 'text-white' : 'text-slate-700'}`}>{sub?.name.split(' (')[0] || id}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-3xl font-black ${isCurrent ? 'text-white' : 'text-slate-900'}`}>{count}</span>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${isCurrent ? 'text-blue-100' : 'text-slate-400'}`}>SAs</span>
                      </div>
                    </button>
                  );
                })}
               </div>
               {selectedSubjectId !== 'all' && (
                 <div className="flex justify-center">
                    <button onClick={() => setSelectedSubjectId('all')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors bg-slate-100 px-8 py-3 rounded-xl border border-slate-200">
                      Veure comparativa total d'àrees
                    </button>
                 </div>
               )}
            </div>
          )}
          {activeAnalysisTab === 'competencies' && renderRanking(stats.competencies, 'Competència Específica')}
          {activeAnalysisTab === 'criteris' && renderRanking(stats.criteris, 'Criteri d\'Avaluació')}
          {activeAnalysisTab === 'sabers' && renderRanking(stats.sabers, 'Saber Bàsic')}
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-16 rounded-[4rem] text-white flex flex-col md:flex-row items-center justify-between gap-12 relative overflow-hidden group">
        <div className="relative z-10 space-y-4">
          <h5 className="text-4xl font-black tracking-tight leading-none">Visió Holística del Curs</h5>
          <p className="text-blue-100 font-bold max-w-2xl text-lg leading-relaxed">
            {stats.total === 0 && selectedSubjectId === 'all'
              ? "Crea les teves primeres situacions d'aprenentatge per generar un diagnòstic de la teva cobertura curricular." 
              : selectedSubjectId !== 'all' 
                ? `Estàs analitzant el pes curricular de ${allSubjects.find(s => s.id === selectedSubjectId)?.name.split(' (')[0]}. Aquest rànquing t'ajudarà a assegurar que no ignores cap criteri essencial de l'àrea.`
                : `Has cobert ${Object.keys(stats.areas).length} àrees curriculars amb un total de ${stats.competencies.length} competències específiques úniques. La teva programació té un caràcter ${Object.keys(stats.areas).length > 4 ? 'altament interdisciplinari i competencial' : 'enfocat i especialitzat'}.`}
          </p>
        </div>
        <button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="bg-white text-slate-900 px-12 py-6 rounded-3xl text-xs font-black uppercase tracking-widest shadow-2xl flex items-center gap-4 hover:scale-105 transition-all active:scale-95 relative z-10 shrink-0">
          Revisar Programació <ArrowUpRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
