
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
  PlusCircle, BookOpen, ArrowLeft, Loader2, Save, School, Wand2, X, Sparkles, ChevronRight, Check, Search, Lightbulb, Flag, Target, Compass, GraduationCap, 
  Upload, Download, SquarePlus
} from 'lucide-react';

// Define view and tab states
type ViewType = 'dashboard' | 'calendar' | 'analytics' | 'create';
type CreateTab = 'basics' | 'curriculum' | 'sequence' | 'evaluation';

const generateId = () => Math.random().toString(36).substr(2, 9);

const TAB_LABELS: Record<string, string> = {
  basics: 'Informació Bàsica',
  curriculum: 'Vincle Curricular',
  sequence: 'Seqüència Didàctica',
  evaluation: 'Avaluació'
};

export default function App() {
  const [view, setView] = useState<ViewType>('dashboard');
  const [activeTab, setActiveTab] = useState<CreateTab>('basics');
  const [activities, setActivities] = useState<Activity[]>(() => {
    try {
      const saved = localStorage.getItem('einacurricular_data_v3');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  
  const [notification, setNotification] = useState<{message: string, type: 'error' | 'success'} | null>(null);

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
  const [newCustomTool, setNewCustomTool] = useState<string>(''); 
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
    localStorage.setItem('einacurricular_data_v3', JSON.stringify(activities));
  }, [activities]);

  const showNotification = (message: string, type: 'error' | 'success' = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
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
    showNotification("SA guardada correctament", "success");
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null); setTitle(''); setDescription(''); setGrade(Grade.First); 
    setDetailedActivities([]); setSessionDates([]); setSelectedCurriculum([]); setSuggestions(null); 
    setEvaluationTools([]); setSuggestedEvaluationTools([]); setNewCustomTool(''); setEvaluationToolsContent({}); 
    setActiveTab('basics'); setNumSessions(6);
  };

  const handleAiCurriculum = async () => {
    if (!description || selectedSubjectIds.length === 0) return showNotification("Cal descripció i àrees seleccionades.", "error");
    setAiLoading(true);
    try {
      const subNames = selectedSubjectIds.map(id => [...SUBJECTS, ...TRANSVERSAL_COMPETENCIES].find(s => s.id === id)?.name || '');
      const res = await getCurriculumSuggestions(subNames, grade, description);
      setSuggestions(res);
      showNotification("Currículum vinculat amb èxit", "success");
    } catch (e: any) {
      showNotification("Error de l'IA. Revisa la clau d'API.", "error");
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateSequence = async () => {
    if (!title || !description) return showNotification("Omple títol i descripció.", "error");
    setSequenceLoading(true);
    try {
      const subNames = selectedSubjectIds.map(id => [...SUBJECTS, ...TRANSVERSAL_COMPETENCIES].find(s => s.id === id)?.name || '');
      const res = await generateDetailedActivities(title, description, grade, subNames, numSessions);
      setDetailedActivities(res);
      setSessionDates(Array(res.length).fill('')); 
      showNotification("Sessions generades", "success");
    } catch (e) {
      showNotification("Error de l'IA.", "error");
    } finally {
      setSequenceLoading(false);
    }
  };

  const handleSuggestEvalTools = async () => {
    if (selectedCurriculum.filter(i => i.type === 'criteri').length === 0) return showNotification("Tria criteris d'avaluació primer.", "error");
    setEvalLoading(true);
    try {
      const tools = await suggestEvaluationTools(title, grade, selectedCurriculum.filter(i => i.type === 'criteri'));
      setSuggestedEvaluationTools(tools);
      setEvaluationTools(tools); 
      showNotification("Instruments suggerits", "success");
    } catch (e) {
      showNotification("Error de l'IA suggerint instruments.", "error");
    } finally {
      setEvalLoading(false);
    }
  };

  const handleGenerateSelectedToolContent = async () => {
    if (evaluationTools.length === 0) return showNotification("Selecciona almenys un instrument per generar contingut.", "error");
    setGeneratingToolContent(true);
    try {
      const contents: Record<string, string> = {};
      const criteria = selectedCurriculum.filter(i => i.type === 'criteri');
      for (const t of evaluationTools) {
        contents[t] = await generateEvaluationToolContent(t, title, grade, criteria);
      }
      setEvaluationToolsContent(contents);
      showNotification("Contingut d'avaluació generat", "success");
    } catch (e) {
      showNotification("Error de l'IA generant contingut d'avaluació.", "error");
    } finally {
      setGeneratingToolContent(false);
    }
  };

  const handleInspiration = async () => {
    if (selectedSubjectIds.length === 0) return showNotification("Tria una àrea.", "error");
    setInspirationLoading(true);
    try {
      const subNames = selectedSubjectIds.map(id => [...SUBJECTS, ...TRANSVERSAL_COMPETENCIES].find(s => s.id === id)?.name || '');
      const options = await getTitleOptions(subNames, grade, title);
      setInspirationOptions(options);
      setShowInspirationModal(true);
    } catch (e) {
      showNotification("Error de l'IA.", "error");
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
      const desc = await getDescriptionForTitle(opt, subNames, grade);
      setDescription(desc);
      showNotification("SA inspirada correctament", "success");
    } catch (e) {
      showNotification("Error de l'IA.", "error");
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleAddCustomTool = () => {
    if (newCustomTool.trim() && !evaluationTools.includes(newCustomTool.trim())) {
      setEvaluationTools(prev => [...prev, newCustomTool.trim()]);
      setNewCustomTool('');
      showNotification("Instrument personalitzat afegit", "success");
    } else if (evaluationTools.includes(newCustomTool.trim())) {
      showNotification("Aquest instrument ja existeix.", "error");
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
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `eina_curricular_backup_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("Còpia de seguretat exportada", "success");
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsedData = JSON.parse(e.target?.result as string);
        if (!Array.isArray(parsedData) || (parsedData.length > 0 && (!parsedData[0].id || !parsedData[0].title))) {
          showNotification("El fitxer de còpia de seguretat no té un format vàlid.", "error");
          return;
        }

        if (window.confirm("La importació de dades sobreescriurà les Situacions d'Aprenentatge actuals. Estàs segur?")) {
          setActivities(parsedData);
          showNotification("Còpia de seguretat importada correctament", "success");
        }
      } catch (error) {
        showNotification("Error en processar el fitxer JSON.", "error");
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = () => {
      showNotification("Error en llegir el fitxer.", "error");
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#f8fcf8] text-slate-800 flex flex-col font-sans">
      <nav className="bg-white border-b border-blue-100 sticky top-0 z-40 h-16 flex items-center px-6 justify-between shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('dashboard')}>
          <div className="bg-blue-600 text-white p-2 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
            <GraduationCap size={20} />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-tight leading-none text-slate-900">
              EINA<span className="text-blue-600">CURRICULAR</span>
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-6">
            {['dashboard', 'calendar', 'analytics'].map((v) => (
              <button 
                key={v}
                onClick={() => setView(v as ViewType)} 
                className={`text-[11px] font-black uppercase tracking-widest transition-all relative py-2 ${view === v ? 'text-blue-600' : 'text-slate-500 hover:text-blue-500'}`}
              >
                {v === 'dashboard' ? 'Inici' : v === 'calendar' ? 'Calendari' : 'Anàlisi'}
                {view === v && <span className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-full"></span>}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="flex-grow p-6 max-w-full mx-auto w-full mb-16">
        {view === 'dashboard' && (
          <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
              <div>
                <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">Programació d'Aula</h1>
                <p className="text-slate-600 font-bold mt-2 text-lg">Tens <span className="text-blue-700 font-black">{activities.length}</span> situacions d'aprenentatge actives.</p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <div className="relative flex-grow md:flex-grow-0">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Cerca SA..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-white border-2 border-slate-200 pl-11 pr-5 py-3.5 rounded-xl text-sm font-bold outline-none focus:border-blue-500 shadow-sm w-full md:w-64 transition-all text-slate-700" />
                </div>
                <button onClick={() => { resetForm(); setView('create'); }} className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95"><PlusCircle size={20} /> Nova SA</button>
              </div>
            </div>
            
            {filteredActivities.length === 0 ? (
              <div className="bg-white rounded-[3rem] p-24 text-center border-2 border-blue-100 shadow-lg">
                <div className="bg-blue-50 w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-8 text-blue-300">
                  <BookOpen size={56} />
                </div>
                <h3 className="text-3xl font-black text-slate-400 tracking-tight">Cap programació trobada</h3>
                <p className="text-slate-500 mt-3 font-bold max-w-sm mx-auto text-lg leading-relaxed">Comença a dissenyar la teva primera Situació d'Aprenentatge competencial.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredActivities.map(act => (
                  <ActivityCard 
                    key={act.id} 
                    activity={{...act, color: 'bg-blue-700'}} 
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
                      const newId = generateId();
                      const copy = {...a, id: newId, title: a.title + ' (còpia)', createdAt: Date.now()};
                      setActivities(p => [copy, ...p]);
                      showNotification("SA duplicada", "success");
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
          <div className="max-w-full mx-auto bg-white rounded-[3rem] shadow-2xl overflow-hidden border-2 border-blue-100 animate-scale-in flex flex-col min-h-[85vh]">
            <div className="flex border-b-2 border-blue-50 bg-blue-50/30 p-3 gap-3">
              {Object.keys(TAB_LABELS).map(t => (
                <button key={t} onClick={() => setActiveTab(t as CreateTab)} className={`flex-1 py-4 rounded-[2rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:bg-blue-100'}`}>{TAB_LABELS[t]}</button>
              ))}
            </div>
            
            <div className="p-10 md:p-14 flex-grow overflow-y-auto">
              {activeTab === 'basics' && (
                <div className="space-y-16 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
                    <div className="md:col-span-4 space-y-5">
                      <label className="block text-[11px] font-black uppercase tracking-widest text-blue-800 ml-2">Nivell Escolar</label>
                      <select className="w-full bg-slate-50 p-5 rounded-[1.5rem] font-black text-lg outline-none border-2 border-slate-200 focus:border-blue-500 appearance-none cursor-pointer hover:bg-white transition-all shadow-md text-slate-700" value={grade} onChange={e => setGrade(e.target.value as Grade)}>
                        {GRADES.map(g => <option key={g} value={g}>{g} de Primària</option>)}
                      </select>
                    </div>

                    <div className="md:col-span-8 space-y-10">
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-blue-800 ml-2 mb-6">Àrees Curriculars</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {SUBJECTS.map(s => (
                            <button 
                              key={s.id} 
                              onClick={() => setSelectedSubjectIds(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])} 
                              className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all ${selectedSubjectIds.includes(s.id) ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'}`}
                            >
                              <div className={`${selectedSubjectIds.includes(s.id) ? 'text-white' : 'text-blue-600'} transition-colors`}>
                                {SUBJECT_ICONS[s.id] || SUBJECT_ICONS.default}
                              </div>
                              <span className="text-[10px] font-bold text-center leading-tight uppercase tracking-tight">
                                {s.name.split(' (')[0].replace('Coneixement del ', '')}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-slate-600 ml-2 mb-6">Competències Transversals</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {TRANSVERSAL_COMPETENCIES.map(s => (
                            <button 
                              key={s.id} 
                              onClick={() => setSelectedSubjectIds(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])} 
                              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${selectedSubjectIds.includes(s.id) ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                            >
                              <div className={`${selectedSubjectIds.includes(s.id) ? 'text-blue-400' : 'text-slate-400'}`}>
                                {SUBJECT_ICONS[s.id] || SUBJECT_ICONS.default}
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-tight">
                                {s.name.replace('Competència ', '')}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8 bg-slate-50/50 p-10 rounded-[3rem] border-2 border-slate-100">
                    <div className="flex items-center gap-4 ml-3">
                       <Flag size={24} className="text-blue-700" />
                       <label className="block text-[12px] font-black uppercase tracking-[0.2em] text-blue-900">Títol de la Situació d'Aprenentatge</label>
                    </div>
                    <div className="flex gap-6 items-center">
                      <input className="flex-1 text-4xl font-black outline-none border-b-4 border-blue-100 py-6 focus:border-blue-600 bg-transparent transition-all placeholder:text-slate-200 tracking-tight text-slate-900" placeholder="Escriu el títol aquí..." value={title} onChange={e => setTitle(e.target.value)} />
                      <button onClick={handleInspiration} disabled={inspirationLoading} className="bg-blue-900 text-white p-6 rounded-[2rem] hover:bg-blue-700 transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center min-w-[80px]">
                        {inspirationLoading ? <Loader2 size={28} className="animate-spin" /> : <Wand2 size={28} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex items-center gap-4 ml-3">
                       <Target size={24} className="text-blue-700" />
                       <label className="block text-[12px] font-black uppercase tracking-[0.2em] text-blue-900">Descripció del Context i Repte</label>
                    </div>
                    <div className="relative">
                      {isGeneratingDescription && (
                        <div className="absolute inset-0 bg-white/95 backdrop-blur-xl z-10 flex flex-col items-center justify-center rounded-[4rem] border-3 border-dashed border-blue-300 shadow-xl">
                          <Loader2 className="animate-spin text-blue-700 mb-6" size={56} />
                          <span className="text-[12px] font-black uppercase tracking-[0.3em] text-blue-800 animate-pulse">L'IA està redactant...</span>
                        </div>
                      )}
                      <textarea className="w-full bg-white p-12 rounded-[4rem] font-bold min-h-[350px] outline-none border-3 border-slate-100 focus:border-blue-200 transition-all leading-relaxed text-slate-800 text-xl shadow-lg placeholder:text-slate-300" placeholder="Descriu el context motivador, el repte i el producte final..." value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-12 border-t-2 border-slate-100">
                    <button onClick={() => setView('dashboard')} className="flex items-center gap-4 text-slate-600 hover:text-blue-900 font-black uppercase tracking-widest text-[11px] transition-colors"><ArrowLeft size={20} /> Tornar al taulell</button>
                    <button onClick={() => setActiveTab('curriculum')} className="bg-blue-900 text-white px-12 py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-widest flex items-center gap-4 hover:bg-black shadow-lg transition-all active:scale-95">Continuar al currículum <ChevronRight size={20} /></button>
                  </div>
                </div>
              )}

              {activeTab === 'curriculum' && (
                <div className="animate-fade-in space-y-16">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-12 rounded-[4rem] flex flex-col md:flex-row items-center justify-between border-3 border-blue-300 shadow-xl gap-10">
                    <div className="flex gap-8 items-center">
                      <div className="bg-white/20 backdrop-blur-md p-6 rounded-3xl text-white shadow-lg"><Sparkles size={42} /></div>
                      <div>
                        <h4 className="font-black text-white text-3xl tracking-tight">Assistent Curricular Intel·ligent</h4>
                        <p className="text-blue-50 text-lg font-bold mt-1">Vinculació directa amb el Decret 175/2022 de Catalunya.</p>
                      </div>
                    </div>
                    <button onClick={handleAiCurriculum} disabled={aiLoading} className="bg-white text-blue-800 px-12 py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-widest flex items-center gap-4 hover:bg-blue-50 shadow-lg disabled:opacity-50 transition-all whitespace-nowrap">
                      {aiLoading ? <Loader2 size={20} className="animate-spin" /> : <Compass size={20} />} Trobar Vincles
                    </button>
                  </div>

                  {suggestions ? (
                    <CurriculumResults 
                      data={suggestions} 
                      selectedItems={selectedCurriculum} 
                      onToggleItem={(item) => setSelectedCurriculum(prev => prev.some(i => i.code === item.code) ? prev.filter(i => i.code !== item.code) : [...prev, item])} 
                    />
                  ) : (
                    <div className="py-40 text-center border-4 border-dashed border-blue-50 rounded-[5rem] bg-white shadow-inner">
                       <p className="text-blue-800 font-black uppercase tracking-[0.3em] text-[12px]">L'assistent t'ajudarà a seleccionar els elements més adients</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-12 border-t-2 border-blue-100">
                    <button onClick={() => setActiveTab('basics')} className="text-slate-600 font-black uppercase tracking-widest text-[11px] hover:text-blue-900 transition-colors">Enrere</button>
                    <button onClick={() => setActiveTab('sequence')} className="bg-blue-900 text-white px-12 py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-widest flex items-center gap-4 hover:bg-black shadow-lg transition-all active:scale-95">Dissenyar Sessions <ChevronRight size={20} /></button>
                  </div>
                </div>
              )}

              {activeTab === 'sequence' && (
                <div className="animate-fade-in space-y-12">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-8 bg-blue-50/40 p-10 rounded-[3rem] border-2 border-blue-100">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-5 bg-white p-5 rounded-2xl shadow-md border border-blue-100">
                        <label className="text-[11px] font-black uppercase tracking-widest text-blue-900 ml-3">Sessions:</label>
                        <input type="number" value={numSessions} onChange={e => setNumSessions(Number(e.target.value))} className="w-20 bg-slate-50 p-3 rounded-xl font-black text-center outline-none border-2 border-slate-200 focus:border-blue-500 text-xl text-slate-800" />
                      </div>
                    </div>
                    <button onClick={handleGenerateSequence} disabled={sequenceLoading} className="bg-blue-600 text-white px-12 py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-widest flex items-center gap-5 shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95">
                      {sequenceLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />} Generar Seqüència amb IA
                    </button>
                  </div>

                  <div className="space-y-12">
                    {detailedActivities.length > 0 ? detailedActivities.map((session, idx) => (
                      <div key={idx} className="bg-white border-3 border-slate-100 rounded-[4rem] overflow-hidden hover:border-blue-200 transition-all shadow-lg">
                        <div className="bg-blue-900 px-14 py-8 flex justify-between items-center text-white">
                          <div className="flex items-center gap-6">
                            <span className="bg-white/20 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-[0.2em]">Sessió {idx + 1}</span>
                            <input className="bg-transparent font-black text-white text-2xl outline-none border-b-2 border-transparent focus:border-blue-400 placeholder:opacity-40 w-[450px]" placeholder="Títol de la sessió..." value={session.title} onChange={e => {
                              const copy = [...detailedActivities];
                              copy[idx].title = e.target.value;
                              setDetailedActivities(copy);
                            }} />
                          </div>
                        </div>
                        <div className="p-16 space-y-12">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                            <div className="space-y-5">
                              <span className="block text-[11px] font-black uppercase text-blue-800 tracking-[0.2em] ml-3">Objectiu d'Aprenentatge</span>
                              <textarea className="w-full bg-slate-50 p-8 rounded-[2rem] text-lg font-black text-slate-900 outline-none focus:bg-white transition-all border-2 border-slate-200 focus:border-blue-200 shadow-inner" rows={4} value={session.objective} onChange={e => {
                                const copy = [...detailedActivities];
                                copy[idx].objective = e.target.value;
                                setDetailedActivities(copy);
                              }} />
                            </div>
                            <div className="space-y-5">
                              <span className="block text-[11px] font-black uppercase text-blue-800 tracking-[0.2em] ml-3">Data de la Sessió</span>
                              <input 
                                type="date" 
                                className="w-full bg-slate-50 p-8 rounded-[2rem] text-lg font-black text-slate-900 outline-none focus:bg-white transition-all border-2 border-slate-200 focus:border-blue-200 shadow-inner" 
                                value={sessionDates[idx] || ''} 
                                onChange={e => {
                                  const newDates = [...sessionDates];
                                  newDates[idx] = e.target.value;
                                  setSessionDates(newDates);
                                }} 
                              />
                            </div>
                            <div className="md:col-span-2 space-y-5">
                              <span className="block text-[11px] font-black uppercase text-blue-800 tracking-[0.2em] ml-3">Desenvolupament</span>
                              <textarea className="w-full bg-slate-50 p-8 rounded-[2rem] text-lg font-bold text-slate-800 outline-none focus:bg-white transition-all border-2 border-slate-200 focus:border-blue-200 shadow-inner leading-relaxed" rows={10} value={session.steps} onChange={e => {
                                const copy = [...detailedActivities];
                                copy[idx].steps = e.target.value;
                                setDetailedActivities(copy);
                              }} />
                            </div>
                            <div className="md:col-span-2 space-y-5">
                              <span className="block text-[11px] font-black uppercase text-indigo-800 tracking-[0.2em] ml-3">Mesures DUA</span>
                              <textarea className="w-full bg-indigo-50 p-8 rounded-[2rem] text-lg font-bold text-indigo-800 outline-none focus:bg-white transition-all border-2 border-indigo-200 focus:border-indigo-400 shadow-inner leading-relaxed" rows={6} value={session.dua} onChange={e => {
                                const copy = [...detailedActivities];
                                copy[idx].dua = e.target.value;
                                setDetailedActivities(copy);
                              }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="py-40 text-center border-4 border-dashed border-slate-100 rounded-[5rem] bg-white shadow-inner">
                        <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[12px]">Utilitza la IA per dissenyar el recorregut didàctic</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-12 border-t-2 border-slate-100">
                    <button onClick={() => setActiveTab('curriculum')} className="text-slate-600 font-black uppercase tracking-widest text-[11px] hover:text-blue-900 transition-colors">Enrere</button>
                    <button onClick={() => setActiveTab('evaluation')} className="bg-blue-900 text-white px-12 py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-widest flex items-center gap-4 hover:bg-black shadow-lg transition-all active:scale-95">Configurar Avaluació <ChevronRight size={20} /></button>
                  </div>
                </div>
              )}

              {activeTab === 'evaluation' && (
                <div className="animate-fade-in space-y-16">
                  <div className="space-y-8 bg-blue-50/40 p-10 rounded-[3rem] border-2 border-blue-100">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex-1">
                        <h4 className="font-black text-3xl text-blue-900 tracking-tight">Instruments d'Avaluació</h4>
                        <p className="text-blue-700 font-bold text-lg mt-2">Selecciona els instruments que vols generar amb IA.</p>
                      </div>
                      <button onClick={handleSuggestEvalTools} disabled={evalLoading} className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest flex items-center gap-4 shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95 whitespace-nowrap">
                        {evalLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />} Suggerir Instruments
                      </button>
                    </div>

                    {suggestedEvaluationTools.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-blue-100">
                        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-800 ml-3">Suggerits per l'IA:</h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {suggestedEvaluationTools.map((tool, idx) => (
                            <label key={idx} className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-slate-100 hover:border-blue-400 transition-all cursor-pointer shadow-sm">
                              <input 
                                type="checkbox" 
                                checked={evaluationTools.includes(tool)} 
                                onChange={() => setEvaluationTools(prev => prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool])}
                                className="form-checkbox h-5 w-5 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500"
                              />
                              <span className="font-bold text-slate-800 text-sm">{tool}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4 pt-4 border-t border-blue-100">
                      <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-800 ml-3">Afegeix el teu propi instrument:</h5>
                      <div className="flex gap-4">
                        <input
                          type="text"
                          value={newCustomTool}
                          onChange={(e) => setNewCustomTool(e.target.value)}
                          placeholder="Nom de l'instrument (ex: Escala d'observació de coavaluació)"
                          className="flex-1 bg-white p-4 rounded-xl font-bold text-slate-700 outline-none border-2 border-slate-200 focus:border-indigo-400 shadow-sm"
                        />
                        <button onClick={handleAddCustomTool} className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all shadow-md active:scale-95 flex items-center gap-2">
                          <SquarePlus size={18} /> Afegir
                        </button>
                      </div>
                      {evaluationTools.length > 0 && (
                        <div className="space-y-3 mt-5">
                          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 ml-3">Instruments seleccionats:</h5>
                          <div className="flex flex-wrap gap-2">
                            {evaluationTools.map((tool, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-slate-100 text-slate-800 px-4 py-2 rounded-full text-xs font-bold border border-slate-200">
                                {tool}
                                <button onClick={() => setEvaluationTools(prev => prev.filter(t => t !== tool))} className="ml-1 text-slate-400 hover:text-red-600 transition-colors">
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-6 border-t border-blue-100 flex justify-end">
                      <button onClick={handleGenerateSelectedToolContent} disabled={evaluationTools.length === 0 || generatingToolContent} className="bg-blue-700 text-white px-12 py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-widest flex items-center gap-5 shadow-lg hover:bg-blue-800 disabled:opacity-50 transition-all active:scale-95">
                        {generatingToolContent ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />} Generar Contingut d'Avaluació
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {evaluationTools.map((tool, idx) => (
                      <div key={idx} className="bg-white border-3 border-slate-100 rounded-[4rem] p-12 hover:border-blue-300 transition-all shadow-lg flex flex-col">
                        <div className="flex justify-between items-center mb-10">
                          <h5 className="font-black text-blue-800 uppercase tracking-[0.3em] text-[12px] bg-blue-50 px-6 py-3 rounded-[1.2rem]">{tool}</h5>
                          <button onClick={() => setEvaluationTools(p => p.filter(t => t !== tool))} className="text-slate-300 hover:text-red-600 transition-colors p-1.5"><X size={28} /></button>
                        </div>
                        <div className="prose prose-slate max-w-none text-slate-900 font-bold overflow-auto max-h-[500px] border-t-2 border-slate-50 pt-8 text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: evaluationToolsContent[tool] || '<p class="text-blue-800 italic animate-pulse text-center py-16">L\'IA està donant forma a l\'instrument...</p>' }} />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-14 border-t-4 border-slate-50">
                    <button onClick={() => setActiveTab('sequence')} className="text-slate-600 font-black uppercase tracking-widest text-[11px] hover:text-blue-900 transition-colors">Enrere</button>
                    <button onClick={handleSave} className="bg-blue-700 text-white px-20 py-7 rounded-[2rem] font-black uppercase text-[12px] tracking-[0.3em] flex items-center gap-5 hover:bg-blue-800 shadow-xl active:scale-95 transition-all"><Save size={28} /> Guardar Programació</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t-4 border-blue-100 py-12 mt-auto shrink-0 shadow-inner">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-800">Dissenyat i creat per</span>
            <span className="text-xl font-black text-slate-900 mt-1">Servei Educatiu Vallès Occidental VIII</span>
          </div>
          <div className="flex items-center gap-5 text-blue-800">
            <School size={32} />
            <div className="h-10 w-1 bg-blue-100"></div>
            <p className="text-[11px] font-black uppercase tracking-widest max-w-[220px] text-center md:text-left leading-relaxed">
              Eina de suport a la programació per competències
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleExport} 
              className="bg-blue-100 text-blue-800 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-200 transition-all shadow-sm active:scale-95 flex items-center gap-2"
              title="Exportar còpia de seguretat"
            >
              <Download size={16} /> Exportar
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept="application/json"
              style={{ display: 'none' }}
            />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="bg-sky-100 text-sky-800 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-sky-200 transition-all shadow-sm active:scale-95 flex items-center gap-2"
              title="Importar còpia de seguretat"
            >
              <Upload size={16} /> Importar
            </button>
          </div>
        </div>
      </footer>

      {showInspirationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-2xl animate-fade-in">
          <div className="bg-white rounded-[5rem] p-16 max-w-3xl w-full shadow-2xl animate-scale-in border-4 border-blue-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-3 bg-blue-700"></div>
            <div className="flex justify-between items-center mb-16">
              <div className="flex items-center gap-8">
                <div className="bg-blue-700 text-white p-6 rounded-[2.5rem] shadow-xl"><Lightbulb size={48} /></div>
                <div>
                  <h2 className="text-5xl font-black text-slate-900 tracking-tight leading-none">Inspiració</h2>
                  <p className="text-slate-600 text-xl font-bold mt-3">Tria un focus per a la teva situació d'aprenentatge.</p>
                </div>
              </div>
              <button onClick={() => setShowInspirationModal(false)} className="p-5 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-all"><X size={48} /></button>
            </div>
            
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-8">
              {inspirationOptions.map((opt, i) => (
                <button 
                  key={i} 
                  onClick={() => selectInspiration(opt.title)} 
                  className="w-full text-left p-6 bg-slate-50/50 border-2 border-slate-100 rounded-2xl hover:border-blue-400 hover:bg-white hover:shadow-md transition-all group flex items-center justify-between"
                >
                  <div>
                    <span className="text-xl font-black text-slate-900 leading-tight group-hover:text-blue-700 transition-colors block">{opt.title}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-100 px-3 py-1.5 rounded-lg mt-2 inline-block">{opt.style}</span>
                  </div>
                  <ChevronRight size={28} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className={`fixed bottom-10 right-10 px-14 py-7 rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl z-[300] animate-slide-up flex items-center gap-5 border-3 ${notification.type === 'success' ? 'bg-blue-700 text-white border-blue-500' : 'bg-red-700 text-white border-red-500'}`}>
          {notification.type === 'success' ? <Check size={28} /> : <X size={28} />}
          {notification.message}
        </div>
      )}

      {viewingActivity && <ActivityDetailsModal activity={viewingActivity} onClose={() => setViewingActivity(null)} activitySubjectIds={viewingActivity.subjectIds} onDelete={id => setActivities(p => p.filter(a => a.id !== id))} showNotification={showNotification} />}
    </div>
  );
}
