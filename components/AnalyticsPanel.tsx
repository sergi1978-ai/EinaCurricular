
import React, { useState, useMemo } from 'react';
import { Activity } from '../types';
import { SUBJECTS, TRANSVERSAL_COMPETENCIES, SCHOOL_YEARS, GRADES } from '../constants';
import { 
  TrendingUp, 
  BookOpen, 
  AlertCircle, 
  Target, 
  CheckCircle, 
  History,
  PieChart
} from 'lucide-react';

interface AnalyticsPanelProps {
  activities: Activity[];
}

type AnalysisTab = 'competencies' | 'criteris' | 'sabers' | 'temporalitat';

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ activities }) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(SUBJECTS[0].id);
  const [selectedYear, setSelectedYear] = useState<string>(SCHOOL_YEARS[0]);
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<AnalysisTab>('competencies');

  const allSubjects = [...SUBJECTS, ...TRANSVERSAL_COMPETENCIES];
  const selectedSubjectName = allSubjects.find(s => s.id === selectedSubjectId)?.name || '';

  const analyticsData = useMemo(() => {
    const filtered = activities.filter(a => {
      const matchSubject = a.subjectIds 
        ? a.subjectIds.includes(selectedSubjectId)
        : a.subject.includes(selectedSubjectName);
      const matchYear = (a.schoolYear || SCHOOL_YEARS[0]) === selectedYear;
      const matchGrade = selectedGrade === 'all' || a.grade === selectedGrade;
      return matchSubject && matchYear && matchGrade;
    });

    const getStats = (type: 'competencia' | 'criteri' | 'saber') => {
      const items = filtered.flatMap(a => {
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

      const sorted = Object.keys(counts).sort((a, b) => 
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );

      return { counts, texts, sorted, max: Math.max(...(Object.values(counts) as number[]), 0) };
    };

    const monthCounts: Record<string, number> = {
      '09': 0, '10': 0, '11': 0, '12': 0, '01': 0, '02': 0, '03': 0, '04': 0, '05': 0, '06': 0
    };
    
    filtered.forEach(a => {
      const date = new Date(a.createdAt);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      if (monthCounts[month] !== undefined) {
        monthCounts[month]++;
      }
    });

    const monthNames: Record<string, string> = {
      '09': 'Set', '10': 'Oct', '11': 'Nov', '12': 'Des', 
      '01': 'Gen', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'Maig', '06': 'Jun'
    };

    return {
      total: filtered.length,
      competencies: getStats('competencia'),
      criteris: getStats('criteri'), 
      sabers: getStats('saber'),
      temporal: { monthCounts, monthNames }
    };
  }, [activities, selectedSubjectId, selectedSubjectName, selectedYear, selectedGrade]);

  const renderBarChart = (data: any, colorClass: string, label: string) => {
    if (data.sorted.length === 0) {
      return (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <AlertCircle className="mx-auto h-9 w-9 text-gray-300 mb-2" />
          <p className="text-gray-500 font-medium text-sm">No hi ha dades de {label} per a aquesta selecció.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {data.sorted.map((code: string) => {
          const count = data.counts[code];
          const percentage = (count / data.max) * 100;
          return (
            <div key={code} className="group relative">
              <div className="flex justify-between items-end mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`font-mono font-bold text-xs px-1.5 py-0.5 rounded border ${colorClass} bg-opacity-10`}>
                    {code}
                  </span>
                  <span className="text-xs text-gray-500 truncate max-w-[180px] md:max-w-xs italic">
                    {data.texts[code]}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900">{count}</span>
                  <span className="text-[9px] text-gray-400 ml-0.5 uppercase">vegades</span>
                </div>
              </div>
              <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ease-out shadow-sm ${colorClass.split(' ')[0].replace('text-', 'bg-')}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTemporalitat = () => {
    const months = Object.keys(analyticsData.temporal.monthCounts);
    const maxVal = Math.max(...(Object.values(analyticsData.temporal.monthCounts) as number[]), 1);

    return (
      <div className="pt-3">
        <div className="flex items-end justify-between h-48 gap-1.5 md:gap-3 border-b border-gray-200 pb-1.5">
          {months.map(m => {
            const count = analyticsData.temporal.monthCounts[m];
            const height = (count / maxVal) * 100;
            return (
              <div key={m} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                <div className="absolute -top-6 bg-indigo-600 text-white text-[9px] font-bold px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {count} act.
                </div>
                <div 
                  className={`w-full rounded-t-sm transition-all duration-500 bg-indigo-500 group-hover:bg-indigo-400 shadow-sm ${count === 0 ? 'h-1 opacity-20' : ''}`}
                  style={{ height: count === 0 ? '4px' : `${height}%` }}
                />
                <span className="mt-1.5 text-[9px] md:text-xs font-bold text-gray-500 uppercase">
                  {analyticsData.temporal.monthNames[m]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-full mx-auto px-3 sm:px-4 lg:px-6 py-6 animate-fade-in">
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <PieChart className="text-blue-600" size={20} />
              Anàlisi de Cobertura Curricular
            </h2>
            <p className="text-gray-500 mt-1 text-sm">Revisa l'equilibri de la teva programació d'aula.</p>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <div className="flex-1 min-w-[100px]">
              <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Curs</label>
              <select 
                value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full text-xs font-bold border-gray-200 rounded-lg bg-gray-50 focus:ring-blue-500"
              >
                {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[100px]">
              <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Nivell</label>
              <select 
                value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full text-xs font-bold border-gray-200 rounded-lg bg-gray-50 focus:ring-blue-500"
              >
                <option value="all">Tots</option>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1.5">Selecciona Àrea / Àmbit</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full text-sm font-bold border-gray-200 rounded-xl bg-gray-50 py-2.5 px-3 focus:ring-blue-500 focus:border-blue-500"
          >
            <optgroup label="Àrees Curriculars">
              {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </optgroup>
            <optgroup label="Competències Transversals">
              {TRANSVERSAL_COMPETENCIES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </optgroup>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md"><BookOpen size={16} /></div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Activitats</span>
          </div>
          <div className="text-2xl font-black text-gray-900">{analyticsData.total}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md"><Target size={16} /></div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Competències</span>
          </div>
          <div className="text-2xl font-black text-gray-900">{analyticsData.competencies.sorted.length}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-1.5 bg-sky-50 text-sky-600 rounded-md"><CheckCircle size={16} /></div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Criteris</span>
          </div>
          <div className="text-2xl font-black text-gray-900">{analyticsData.criteris.sorted.length}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-1.5 bg-slate-50 text-slate-600 rounded-md"><History size={16} /></div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sabers</span>
          </div>
          <div className="text-2xl font-black text-gray-900">{analyticsData.sabers.sorted.length}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden min-h-[450px] flex flex-col">
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button 
            onClick={() => setActiveAnalysisTab('competencies')}
            className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-widest transition-all ${activeAnalysisTab === 'competencies' ? 'bg-white text-blue-600 border-b-2 border-blue-500' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            Competències
          </button>
          <button 
            onClick={() => setActiveAnalysisTab('criteris')}
            className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-widest transition-all ${activeAnalysisTab === 'criteris' ? 'bg-white text-sky-600 border-b-2 border-sky-500' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            Criteris
          </button>
          <button 
            onClick={() => setActiveAnalysisTab('sabers')}
            className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-widest transition-all ${activeAnalysisTab === 'sabers' ? 'bg-white text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            Sabers
          </button>
          <button 
            onClick={() => setActiveAnalysisTab('temporalitat')}
            className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-widest transition-all ${activeAnalysisTab === 'temporalitat' ? 'bg-white text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            Temporalitat
          </button>
        </div>

        <div className="p-6 flex-grow">
          {activeAnalysisTab === 'competencies' && renderBarChart(analyticsData.competencies, 'text-blue-700 border-blue-200', 'Competències Específiques')}
          {activeAnalysisTab === 'criteris' && renderBarChart(analyticsData.criteris, 'text-sky-700 border-sky-200', 'Criteris d\'Avaluació')}
          {activeAnalysisTab === 'sabers' && renderBarChart(analyticsData.sabers, 'text-indigo-700 border-indigo-200', 'Sabers i Continguts')}
          {activeAnalysisTab === 'temporalitat' && renderTemporalitat()}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
