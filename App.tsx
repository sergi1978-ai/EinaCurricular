
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Grade, Activity, CurriculumItem, AiResponse, Session } from './types';
import { 
  SUBJECTS, 
  TRANSVERSAL_COMPETENCIES, 
  GRADES, 
  SCHOOL_YEARS, 
  SUBJECT_ICONS 
} from './constants'; 
import { 
  getCurriculumSuggestions, 
  generateDetailedActivities, 
  suggestEvaluationTools, 
  generateEvaluationToolContent,
  getTitleOptions,
  getDescriptionForTitle
} from './services/geminiService';
import ActivityCard from './components/ActivityCard';
import CurriculumResults from './components/CurriculumResults';
import ActivityDetailsModal from './components/ActivityDetailsModal';
import CalendarView from './components/CalendarView';
import AnalyticsPanel from './components/AnalyticsPanel';
import { 
  PlusCircle, ArrowLeft, Loader2, Save, School, Wand2, X, Sparkles, ChevronRight, Check, Search, Lightbulb, Flag, Target, Compass, GraduationCap, 
  Upload, Download, AlertCircle, Settings2, Zap, BrainCircuit, Cpu, MousePointer2, Key, ExternalLink, ShieldCheck
} from 'lucide-react';

// Declaració per a l'extensió d'AI Studio
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

type ViewType = 'dashboard' | 'calendar' | 'analytics' | 'create';
type CreateTab = 'basics' | 'curriculum' | 'sequence' | 'evaluation';

const generateId = () => Math.random().toString(36).substr(2, 9);

const TAB_LABELS: Record<string, string> = {
  basics: 'Pas 1: Informació',
  curriculum: 'Pas 2: Currículum',
  sequence: 'Pas 3: Sessions',
  evaluation: 'Pas 4: Avaluació'
};

const AI_MODELS = [
  { 
    id: 'gemini-flash-lite-latest', 
    name: 'Lite', 
    fullName: 'Gemini Lite',
    desc: 'Màxima velocitat i quota alta (15 RPM). Recomanat per a ús massiu en centres.', 
    tag: 'QUOTA ALTA',
    color: 'emerald',
    icon: <Zap size={22} /> 
  },
  { 
    id: 'gemini-3-flash-preview', 
    name: 'Flash', 
    fullName: 'Gemini Flash',
    desc: 'L\'opció més equilibrada. Ideal per a ús individual o grups petits.', 
    tag: 'RECOMANAT',
    color: 'blue',
    icon: <Cpu size={22} /> 
  },
  { 
    id: 'gemini-3-pro-preview', 
    name: 'Pro', 
    fullName: 'Gemini Pro',
    desc: 'Expert en raonament complex. Quota molt limitada (2 RPM).', 
    tag: 'MÀXIMA QUALITAT',
    color: 'purple',
    icon: <BrainCircuit size={22} /> 
  }
];

export default function App() {
  const [view, setView] = useState<ViewType>('dashboard');
  const [activeTab, setActiveTab] = useState<CreateTab>('basics');
  const [activities, setActivities] = useState<Activity[]>(() => {
    try {
      const saved = localStorage.getItem('einacurricular_data_v4');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  
  const [notification, setNotification] = useState<{message: string, type: 'error' | 'success'} | null>(null);

  // AI Configuration State
  const [aiConfig, setAiConfig] = useState(() => {
    const saved = localStorage.getItem('einacurricular_ai_config');
    return saved ? JSON.parse(saved) : {
      simpleModel: 'gemini-flash-lite-latest',
      complexModel: 'gemini-3-flash-preview'
    };
  });

  const [hasPersonalKey, setHasPersonalKey] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);

  // Check personal key status
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasPersonalKey(hasKey);
      }
    };
    checkKey();
  }, []);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [grade, setGrade] = useState<Grade>(Grade.First);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [detailedActivities, setDetailedActivities] = useState<Session[]>([]);
  const [sessionDates, setSessionDates] = useState<string[]>([]); 
  const [evaluationTools, setEvaluationTools] = useState<string[]>([]); 
  const [suggestedEvaluationTools, setSuggestedEvaluationTools] = useState<string[]>([]); 
  const [evaluationToolsContent, setEvaluationToolsContent] = useState<Record<string, string>>({});
  const [selectedCurriculum, setSelectedCurriculum] = useState<CurriculumItem[]>([]);
  const [suggestions, setSuggestions] = useState<AiResponse | null>(null);
  const [numSessions, setNumSessions] = useState<number>(6);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewingActivity, setViewingActivity] = useState<Activity | null>(null);

  const [showInspirationModal, setShowInspirationModal] = useState(false);
  const [inspirationOptions, setInspirationOptions] = useState<{title: string, style: string}[]>([]);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [inspirationLoading, setInspirationLoading] = useState(false);
  const [sequenceLoading, setSequenceLoading] = useState(false);
  const [evalLoading, setEvalLoading] = useState(false);
  const [generatingToolContent, setGeneratingToolContent] = useState(false); 

  const fileInputRef = useRef<HTMLInputElement>(null); 

  useEffect(() => {
    localStorage.setItem('einacurricular_data_v4', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('einacurricular_ai_config', JSON.stringify(aiConfig));
  }, [aiConfig]);

  const showNotification = (message: string, type: 'error' | 'success' = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 6000);
  };

  const handleGeminiError = (e: any) => {
    console.error("Gemini Error:", e);
    if (e.message?.includes("429")) {
      showNotification("Quota saturada. Prova de canviar al model 'Lite' o connecta la teva clau de centre.", "error");
    } else if (e.message?.includes("API_KEY_REQUIRED") || e.message?.includes("Requested entity was not found")) {
      showNotification("S'ha perdut la connexió amb l'IA. Torna a seleccionar la teva clau.", "error");
      setHasPersonalKey(false);
    } else {
      showNotification("Error de l'IA. Torna-ho a provar en uns moments.", "error");
    }
  };

  const handlePersonalKeySelect = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setHasPersonalKey(true);
        showNotification("Clau personal connectada correctament!", "success");
      } catch (e) {
        console.error("Key selection failed", e);
      }
    }
  };

  const handleSave = () => {
    if (!title.trim()) return showNotification("Cal posar un títol a la SA", "error");
    const allSubs = [...SUBJECTS, ...TRANSVERSAL_COMPETENCIES];
    const subNames = selectedSubjectIds.map(id => allSubs.find(s => s.id === id)?.name || '').join(' + ');

    const updatedActivity: Activity = {
      id: editingId || generateId(),
      title: title.trim(), 
      description: description.trim(), 
      grade, 
      schoolYear: SCHOOL_YEARS[0], 
      subject: subNames || 'Sense àrea definida',
      subjectIds: [...selectedSubjectIds],
      detailedActivities: [...detailedActivities],
      sessionDates: [...sessionDates], 
      evaluationTools: [...evaluationTools], 
      evaluationToolsContent: { ...evaluationToolsContent },
      competencies: selectedCurriculum.filter(i => i.type === 'competencia'),
      criteria: selectedCurriculum.filter(i => i.type === 'criteri'),
      sabers: selectedCurriculum.filter(i => i.type === 'saber'),
      createdAt: editingId ? (activities.find(a => a.id === editingId)?.createdAt || Date.now()) : Date.now(),
      color: 'bg-blue-600' 
    };

    setActivities(prev => [updatedActivity, ...prev.filter(a => a.id !== updatedActivity.id)]);
    setView('dashboard');
    showNotification("Situació d'Aprenentatge guardada!", "success");
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null); setTitle(''); setDescription(''); setGrade(Grade.First); 
    setDetailedActivities([]); setSessionDates([]); setSelectedCurriculum([]); setSuggestions(null); 
    setEvaluationTools([]); setSuggestedEvaluationTools([]); setEvaluationToolsContent({}); 
    setActiveTab('basics'); setNumSessions(6);
  };

  const handleAiCurriculum = async () => {
    if (aiLoading) return;
    if (!description || selectedSubjectIds.length === 0) return showNotification("Cal descripció i àrees seleccionades.", "error");
    setAiLoading(true);
    try {
      const subNames = selectedSubjectIds.map(id => [...SUBJECTS, ...TRANSVERSAL_COMPETENCIES].find(s => s.id === id)?.name || '');
      const res = await getCurriculumSuggestions(subNames, grade, description, aiConfig.complexModel);
      setSuggestions(res);
      showNotification("Currículum analitzat correctament.", "success");
    } catch (e: any) {
      handleGeminiError(e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateSequence = async () => {
    if (sequenceLoading) return;
    if (!title || !description) return showNotification("Omple títol i descripció.", "error");
    setSequenceLoading(true);
    try {
      const subNames = selectedSubjectIds.map(id => [...SUBJECTS, ...TRANSVERSAL_COMPETENCIES].find(s => s.id === id)?.name || '');
      const res = await generateDetailedActivities(title, description, grade, subNames, numSessions, aiConfig.complexModel);
      setDetailedActivities(res);
      setSessionDates(Array(res.length).fill('')); 
      showNotification("Sessions generades amb èxit.", "success");
    } catch (e) {
      handleGeminiError(e);
    } finally {
      setSequenceLoading(false);
    }
  };

  const handleSuggestEvalTools = async () => {
    if (evalLoading) return;
    if (selectedCurriculum.filter(i => i.type === 'criteri').length === 0) return showNotification("Tria criteris d'avaluació primer.", "error");
    setEvalLoading(true);
    try {
      const tools = await suggestEvaluationTools(title, grade, selectedCurriculum.filter(i => i.type === 'criteri'), aiConfig.simpleModel);
      setSuggestedEvaluationTools(tools);
      setEvaluationTools(tools); 
      showNotification("Instruments suggerits.", "success");
    } catch (e) {
      handleGeminiError(e);
    } finally {
      setEvalLoading(false);
    }
  };

  const handleGenerateSelectedToolContent = async () => {
    if (generatingToolContent) return;
    if (evaluationTools.length === 0) return showNotification("Selecciona instruments primer.", "error");
    setGeneratingToolContent(true);
    try {
      const contents: Record<string, string> = { ...evaluationToolsContent };
      const criteria = selectedCurriculum.filter(i => i.type === 'criteri');
      for (const t of evaluationTools) {
        if (!contents[t]) {
          contents[t] = await generateEvaluationToolContent(t, title, grade, criteria, aiConfig.complexModel);
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      setEvaluationToolsContent(contents);
      showNotification("Contingut d'avaluació generat correctament.", "success");
    } catch (e) {
      handleGeminiError(e);
    } finally {
      setGeneratingToolContent(false);
    }
  };

  const handleInspiration = async () => {
    if (inspirationLoading) return;
    if (selectedSubjectIds.length === 0) return showNotification("Tria una àrea per poder inspirar-te.", "error");
    setInspirationLoading(true);
    try {
      const subNames = selectedSubjectIds.map(id => [...SUBJECTS, ...TRANSVERSAL_COMPETENCIES].find(s => s.id === id)?.name || '');
      const options = await getTitleOptions(subNames, grade, title, aiConfig.simpleModel);
      
      if (options && options.length > 0) {
        setInspirationOptions(options);
        setShowInspirationModal(true);
      } else {
        showNotification("No s'han pogut generar idees. Prova de canviar el model d'IA.", "error");
      }
    } catch (e) {
      handleGeminiError(e);
    } finally {
      setInspirationLoading(false);
    }
  };

  const selectInspiration = async (opt: string) => {
    setTitle(opt);
    setShowInspirationModal(false);
    setIsGeneratingDescription(true);
    try {
      const subNames = selectedSubjectIds.map(id => [...SUBJECTS, ...TRANSVERSAL_COMPETENCIES].find(s => s.id === id)?.name || '');
      const desc = await getDescriptionForTitle(opt, subNames, grade, aiConfig.simpleModel);
      setDescription(desc);
      showNotification("Descripció generada amb èxit.", "success");
    } catch (e) {
      handleGeminiError(e);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const filteredActivities = useMemo(() => {
    return activities
      .filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [activities, searchQuery]);

  const handleExport = () => {
    const data = JSON.stringify(activities, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_programacions_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsedData = JSON.parse(e.target?.result as string);
        if (window.confirm("Vols substituir les dades actuals per les del fitxer d'importació?")) {
          setActivities(parsedData);
          showNotification("Dades importades correctament.", "success");
        }
      } catch (error) {
        showNotification("Fitxer no vàlid.", "error");
      }
    };
    reader.readAsText(file);
  };

  // Helper to get active model names for the badge
  const activeSimpleModel = AI_MODELS.find(m => m.id === aiConfig.simpleModel);

  return (
    <div className="min-h-screen bg-[#fcfdfe] text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <nav className="bg-white/80 backdrop-blur-md border-b border-blue-100 sticky top-0 z-40 h-16 flex items-center px-6 justify-between shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('dashboard')}>
          <div className="bg-gradient-to-tr from-blue-600 to-blue-400 text-white p-2 rounded-xl shadow-lg group-hover:rotate-6 transition-transform">
            <GraduationCap size={20} />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-tight leading-none text-slate-900">
              EINA<span className="text-blue-600">CURRICULAR</span>
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-8">
            {['dashboard', 'calendar', 'analytics'].map((v) => (
              <button 
                key={v}
                onClick={() => setView(v as ViewType)} 
                className={`text-[11px] font-black uppercase tracking-widest transition-all relative py-2 ${view === v ? 'text-blue-600' : 'text-slate-400 hover:text-slate-900'}`}
              >
                {v === 'dashboard' ? 'Inici' : v === 'calendar' ? 'Calendari' : 'Estadístiques'}
                {view === v && <span className="absolute -bottom-1 left-0 w-full h-1 bg-blue-600 rounded-full"></span>}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Intel·ligència Badge */}
            <div className={`hidden sm:flex items-center rounded-xl px-3 py-1.5 gap-2 border ${hasPersonalKey ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex -space-x-1">
                <div className={`w-2 h-2 rounded-full ${hasPersonalKey ? 'bg-emerald-500' : `bg-${activeSimpleModel?.color || 'blue'}-500`} animate-pulse`}></div>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest ${hasPersonalKey ? 'text-emerald-600' : 'text-slate-400'}`}>
                {hasPersonalKey ? 'Connexió Pròpia' : `IA: ${activeSimpleModel?.name || '...'}`}
              </span>
            </div>
            
            <button onClick={() => setShowAiSettings(true)} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-xl transition-all shadow-sm border border-slate-100 flex items-center gap-2 group">
              <Settings2 size={20} className="group-hover:rotate-45 transition-transform" />
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow p-6 max-w-[1400px] mx-auto w-full mb-16">
        {view === 'dashboard' && (
          <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 bg-white p-8 rounded-[2.5rem] border border-blue-50 shadow-sm">
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">Programació d'Aula</h1>
                <p className="text-slate-500 font-bold mt-1">S'han detectat <span className="text-blue-600">{activities.length}</span> projectes desats.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative flex-grow">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" placeholder="Cerca SA..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-slate-50 border-2 border-slate-100 pl-11 pr-5 py-3 rounded-2xl text-sm font-bold outline-none focus:border-blue-400 focus:bg-white w-full md:w-64 transition-all" />
                </div>
                <button onClick={() => { resetForm(); setView('create'); }} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-blue-200 flex items-center justify-center gap-2 hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95"><PlusCircle size={18} /> Nova SA</button>
              </div>
            </div>
            
            {filteredActivities.length === 0 ? (
              <div className="bg-white rounded-[3rem] p-24 text-center border border-blue-100 shadow-sm">
                <div className="bg-blue-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 text-blue-200 animate-pulse">
                  <Sparkles size={48} />
                </div>
                <h3 className="text-2xl font-black text-slate-400">Encara no hi ha cap SA</h3>
                <p className="text-slate-400 mt-2 font-medium max-w-sm mx-auto">Comença dissenyant un nou projecte educatiu amb l'ajuda de la intel·ligència artificial.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredActivities.map(act => (
                  <ActivityCard 
                    key={act.id} 
                    activity={act} 
                    activitySubjectIds={act.subjectIds} 
                    onDelete={id => setActivities(p => p.filter(a => a.id !== id))} 
                    onView={setViewingActivity} 
                    onEdit={() => { 
                      setEditingId(act.id); setTitle(act.title); setDescription(act.description); setGrade(act.grade);
                      setSelectedSubjectIds(act.subjectIds || []); setDetailedActivities(act.detailedActivities || []);
                      setSessionDates(act.sessionDates || []); 
                      setSelectedCurriculum([...(act.competencies || []), ...(act.criteria || []), ...(act.sabers || [])]);
                      setEvaluationTools(act.evaluationTools || []); setEvaluationToolsContent(act.evaluationToolsContent || {});
                      setView('create'); 
                    }} 
                    onCopy={a => {
                      const copy = {...a, id: generateId(), title: a.title + ' (Còpia)', createdAt: Date.now()};
                      setActivities(p => [copy, ...p]);
                      showNotification("Còpia creada correctament.", "success");
                    }} 
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'calendar' && <CalendarView activities={activities} onEditActivity={id => { const a = activities.find(x => x.id === id); if(a) { setEditingId(a.id); setTitle(a.title); setView('create'); } }} />}
        {view === 'analytics' && <AnalyticsPanel activities={activities} />}

        {view === 'create' && (
          <div className="max-w-6xl mx-auto bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-blue-50 animate-scale-in flex flex-col min-h-[85vh]">
            <div className="flex border-b border-blue-50 bg-slate-50/50 p-3 gap-2 overflow-x-auto">
              {Object.keys(TAB_LABELS).map(t => (
                <button key={t} onClick={() => setActiveTab(t as CreateTab)} className={`flex-1 min-w-[140px] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:bg-white/50'}`}>{TAB_LABELS[t]}</button>
              ))}
            </div>
            
            <div className="p-10 md:p-14 flex-grow overflow-y-auto custom-scrollbar">
              {activeTab === 'basics' && (
                <div className="space-y-16 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                    <div className="md:col-span-4 space-y-4">
                      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">Curs escolar</label>
                      <select className="w-full bg-slate-50 p-5 rounded-2xl font-black text-lg outline-none border border-slate-100 focus:border-blue-400 hover:bg-white transition-all shadow-sm text-slate-700 appearance-none cursor-pointer" value={grade} onChange={e => setGrade(e.target.value as Grade)}>
                        {GRADES.map(g => <option key={g} value={g}>{g} de Primària</option>)}
                      </select>
                    </div>

                    <div className="md:col-span-8 space-y-10">
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-6">Àrees i Competències</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {SUBJECTS.map(s => (
                            <button 
                              key={s.id} 
                              onClick={() => setSelectedSubjectIds(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])} 
                              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${selectedSubjectIds.includes(s.id) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-500 border-slate-50 hover:border-blue-200'}`}
                            >
                              <div className={`${selectedSubjectIds.includes(s.id) ? 'text-white' : 'text-blue-500'}`}>
                                {SUBJECT_ICONS[s.id] || SUBJECT_ICONS.default}
                              </div>
                              <span className="text-[10px] font-bold text-left leading-tight uppercase tracking-tight">
                                {s.name.split(' (')[0].replace('Coneixement del ', '')}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3 ml-2">
                       <Flag size={20} className="text-blue-600" />
                       <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400">Títol de la SA</label>
                    </div>
                    <div className="flex gap-4 items-center">
                      <input className="flex-1 text-2xl md:text-4xl font-black outline-none border-b-4 border-slate-50 py-4 focus:border-blue-600 bg-transparent transition-all placeholder:text-slate-100 text-slate-900" placeholder="Escriu el títol aquí..." value={title} onChange={e => setTitle(e.target.value)} />
                      <button onClick={handleInspiration} disabled={inspirationLoading} className="bg-slate-900 text-white p-5 rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50 group relative">
                        {inspirationLoading ? <Loader2 size={24} className="animate-spin" /> : <Wand2 size={24} />}
                        <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Inspira'm!</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3 ml-2">
                       <Target size={20} className="text-blue-600" />
                       <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400">Descripció i Contextualització</label>
                    </div>
                    <div className="relative">
                      {isGeneratingDescription && (
                        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-blue-200">
                          <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 animate-pulse">L'IA està redactant la proposta...</span>
                        </div>
                      )}
                      <textarea className="w-full bg-slate-50 p-10 rounded-[2.5rem] font-bold min-h-[300px] outline-none border border-slate-100 focus:border-blue-200 transition-all leading-relaxed text-slate-700 text-lg shadow-inner placeholder:text-slate-200" placeholder="Descriu el context, el repte inicial i el producte final que es vol aconseguir..." value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-10 border-t border-slate-50">
                    <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black uppercase tracking-widest text-[10px] transition-colors"><ArrowLeft size={16} /> Tornar enrere</button>
                    <button onClick={() => setActiveTab('curriculum')} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center gap-3 hover:bg-black shadow-lg transition-all active:scale-95">Següent: Currículum <ChevronRight size={16} /></button>
                  </div>
                </div>
              )}

              {activeTab === 'curriculum' && (
                <div className="animate-fade-in space-y-12">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-10 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between border border-blue-400 shadow-xl gap-8">
                    <div className="flex gap-6 items-center">
                      <div className="bg-white/20 p-4 rounded-2xl text-white"><Sparkles size={32} /></div>
                      <div>
                        <h4 className="font-black text-white text-2xl tracking-tight">Vincle Curricular Intel·ligent</h4>
                        <p className="text-blue-100 text-sm font-bold">L'IA cercarer els elements del Decret 175/2022 més adients per a la teva SA.</p>
                      </div>
                    </div>
                    <button onClick={handleAiCurriculum} disabled={aiLoading} className="bg-white text-blue-900 px-8 py-4 rounded-xl font-black uppercase text-[11px] tracking-widest flex items-center gap-3 hover:bg-blue-50 shadow-lg disabled:opacity-50 transition-all">
                      {aiLoading ? <Loader2 size={18} className="animate-spin" /> : <Compass size={18} />} Analitzar Currículum
                    </button>
                  </div>

                  {suggestions ? (
                    <CurriculumResults 
                      data={suggestions} 
                      selectedItems={selectedCurriculum} 
                      onToggleItem={(item) => setSelectedCurriculum(prev => prev.some(i => i.code === item.code) ? prev.filter(i => i.code !== item.code) : [...prev, item])} 
                    />
                  ) : (
                    <div className="py-40 text-center border-2 border-dashed border-blue-50 rounded-[3rem] bg-white">
                       <p className="text-slate-300 font-black uppercase tracking-[0.2em] text-[11px]">Fes clic a "Analitzar Currículum" per obtenir suggeriments de la IA</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-10 border-t border-slate-50">
                    <button onClick={() => setActiveTab('basics')} className="text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-900 transition-colors">Enrere</button>
                    <button onClick={() => setActiveTab('sequence')} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center gap-3 hover:bg-black shadow-lg transition-all active:scale-95">Següent: Sessions <ChevronRight size={16} /></button>
                  </div>
                </div>
              )}

              {activeTab === 'sequence' && (
                <div className="animate-fade-in space-y-12">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-50">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nº Sessions:</label>
                        <input type="number" value={numSessions} onChange={e => setNumSessions(Number(e.target.value))} className="w-16 bg-slate-50 p-2 rounded-lg font-black text-center outline-none border border-slate-100 focus:border-blue-400 text-lg" />
                      </div>
                    </div>
                    <button onClick={handleGenerateSequence} disabled={sequenceLoading} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center gap-3 shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all">
                      {sequenceLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} Dissenyar Seqüència Didàctica
                    </button>
                  </div>

                  <div className="space-y-10