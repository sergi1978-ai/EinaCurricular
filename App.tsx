
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
  Upload, Download, SquarePlus, AlertCircle
} from 'lucide-react';

type ViewType = 'dashboard' | 'calendar' | 'analytics' | 'create';
type CreateTab = 'basics' | 'curriculum' | 'sequence' | 'evaluation';

const generateId = () => Math.random().toString(36).substr(2, 9);

const TAB_LABELS: Record<string, string> = {
  basics: 'Pas 1: Informació',
  curriculum: 'Pas 2: Currículum',
  sequence: 'Pas 3: Sessions',
  evaluation: 'Pas 4: Avaluació'
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
    setTimeout(() => setNotification(null), 5000);
  };

  const handleGeminiError = (e: any) => {
    console.error(e);
    if (e.message === "API_KEY_REQUIRED") {
      showNotification("Configuració incompleta: Falta la clau d'API.", "error");
    } else if (e.message === "RATE_LIMIT_EXCEEDED") {
      showNotification("L'IA està saturada de peticions. Espera uns 10 segons i torna-ho a provar.", "error");
    } else if (e.message === "INVALID_API_KEY") {
      showNotification("La clau d'API de Gemini no és vàlida o ha expirat.", "error");
    } else if (e.message === "EMPTY_RESPONSE") {
      showNotification("L'IA ha tornat una resposta buida. Torna-ho a intentar.", "error");
    } else {
      showNotification("Error de connexió amb l'IA. Revisa la teva connexió a internet.", "error");
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
    showNotification("Situació d'Aprenentatge guardada correctament!", "success");
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null); setTitle(''); setDescription(''); setGrade(Grade.First); 
    setDetailedActivities([]); setSessionDates([]); setSelectedCurriculum([]); setSuggestions(null); 
    setEvaluationTools([]); setSuggestedEvaluationTools([]); setNewCustomTool(''); setEvaluationToolsContent({}); 
    setActiveTab('basics'); setNumSessions(6);
  };

  const handleAiCurriculum = async () => {
    if (!description || selectedSubjectIds.length === 0) return showNotification("Necessitem una descripció i àrees per analitzar el currículum.", "error");
    setAiLoading(true);
    try {
      const subNames = selectedSubjectIds.map(id => [...SUBJECTS, ...TRANSVERSAL_COMPETENCIES].find(s => s.id === id)?.name || '');
      const res = await getCurriculumSuggestions(subNames, grade, description);
      setSuggestions(res);
      showNotification("Anàlisi curricular completat", "success");
    } catch (e: any) {
      handleGeminiError(e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateSequence = async () => {
    if (!title || !description) return showNotification("Defineix el títol i la descripció abans de generar sessions.", "error");
    setSequenceLoading(true);
    try {
      const subNames = selectedSubjectIds.map(id => [...SUBJECTS, ...TRANSVERSAL_COMPETENCIES].find(s => s.id === id)?.name || '');
      const res = await generateDetailedActivities(title, description, grade, subNames, numSessions);
      setDetailedActivities(res);
      setSessionDates(Array(res.length).fill('')); 
      showNotification("Seqüència de sessions generada", "success");
    } catch (e) {
      handleGeminiError(e);
    } finally {
      setSequenceLoading(false);
    }
  };

  const handleSuggestEvalTools = async () => {
    if (selectedCurriculum.filter(i => i.type === 'criteri').length === 0) return showNotification("Selecciona criteris d'avaluació primer.", "error");
    setEvalLoading(true);
    try {
      const tools = await suggestEvaluationTools(title, grade, selectedCurriculum.filter(i => i.type === 'criteri'));
      setSuggestedEvaluationTools(tools);
      setEvaluationTools(tools); 
      showNotification("S'han suggerit instruments d'avaluació", "success");
    } catch (e) {
      handleGeminiError(e);
    } finally {
      setEvalLoading(false);
    }
  };

  const handleGenerateSelectedToolContent = async () => {
    if (evaluationTools.length === 0) return showNotification("Selecciona algun instrument per generar-ne el contingut.", "error");
    setGeneratingToolContent(true);
    try {
      const contents: Record<string, string> = {};
      const criteria = selectedCurriculum.filter(i => i.type === 'criteri');
      // Fem les crides una a una per evitar col·lapsar la quota si n'hi ha moltes
      for (const t of evaluationTools) {
        contents[t] = await generateEvaluationToolContent(t, title, grade, criteria);
      }
      setEvaluationToolsContent(contents);
      showNotification("Contingut d'avaluació creat correctament", "success");
    } catch (e) {
      handleGeminiError(e);
    } finally {
      setGeneratingToolContent(false);
    }
  };

  const handleInspiration = async () => {
    if (selectedSubjectIds.length === 0) return showNotification("Selecciona almenys una àrea per buscar inspiració.", "error");
    setInspirationLoading(true);
    try {
      const subNames = selectedSubjectIds.map(id => [...SUBJECTS, ...TRANSVERSAL_COMPETENCIES].find(s => s.id === id)?.name || '');
      const options = await getTitleOptions(subNames, grade, title);
      setInspirationOptions(options);
      setShowInspirationModal(true);
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
      const desc = await getDescriptionForTitle(opt, subNames, grade);
      setDescription(desc);
      showNotification("Proposta de descripció generada", "success");
    } catch (e) {
      handleGeminiError(e);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleAddCustomTool = () => {
    if (newCustomTool.trim() && !evaluationTools.includes(newCustomTool.trim())) {
      setEvaluationTools(prev => [...prev, newCustomTool.trim()]);
      setNewCustomTool('');
      showNotification("Instrument personalitzat afegit", "success");
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
    showNotification("Còpia de seguretat exportada", "success");
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsedData = JSON.parse(e.target?.result as string);
        if (window.confirm("Atenució: Això substituirà les teves dades actuals. Vols importar el fitxer?")) {
          setActivities(parsedData);
          showNotification("Dades importades amb èxit", "success");
        }
      } catch (error) {
        showNotification("El fitxer no té un format vàlid.", "error");
      }
    };
    reader.readAsText(file);
  };

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
                {v === 'dashboard' ? 'Taulell' : v === 'calendar' ? 'Calendari' : 'Estadístiques'}
                {view === v && <span className="absolute -bottom-1 left-0 w-full h-1 bg-blue-600 rounded-full"></span>}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="flex-grow p-6 max-w-[1400px] mx-auto w-full mb-16">
        {view === 'dashboard' && (
          <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 bg-white p-8 rounded-[2.5rem] border border-blue-50 shadow-sm">
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight text-center md:text-left">Programació d'Aula</h1>
                <p className="text-slate-500 font-bold mt-1 text-center md:text-left">Gestió de <span className="text-blue-600 font-black">{activities.length}</span> Situacions d'Aprenentatge.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative flex-grow">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" placeholder="Cerca pel títol..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-slate-50 border-2 border-slate-100 pl-11 pr-5 py-3 rounded-2xl text-sm font-bold outline-none focus:border-blue-400 focus:bg-white w-full md:w-64 transition-all" />
                </div>
                <button onClick={() => { resetForm(); setView('create'); }} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-blue-200 flex items-center justify-center gap-2 hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95"><PlusCircle size={18} /> Crear SA</button>
              </div>
            </div>
            
            {filteredActivities.length === 0 ? (
              <div className="bg-white rounded-[3rem] p-24 text-center border border-blue-100 shadow-sm">
                <div className="bg-blue-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 text-blue-200 animate-pulse">
                  <Sparkles size={48} />
                </div>
                <h3 className="text-2xl font-black text-slate-400">No s'han trobat programacions</h3>
                <p className="text-slate-400 mt-2 font-medium max-w-sm mx-auto">Crea la teva primera Situació d'Aprenentatge o utilitza el cercador.</p>
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
                      showNotification("Programació duplicada", "success");
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
                <button key={t} onClick={() => setActiveTab(t as CreateTab)} className={`flex-1 min-w-[120px] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:bg-white/50'}`}>{TAB_LABELS[t]}</button>
              ))}
            </div>
            
            <div className="p-10 md:p-14 flex-grow overflow-y-auto custom-scrollbar">
              {activeTab === 'basics' && (
                <div className="space-y-16 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                    <div className="md:col-span-4 space-y-4">
                      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">Nivell Educatiu</label>
                      <select className="w-full bg-slate-50 p-5 rounded-2xl font-black text-lg outline-none border border-slate-100 focus:border-blue-400 hover:bg-white transition-all shadow-sm text-slate-700 appearance-none cursor-pointer" value={grade} onChange={e => setGrade(e.target.value as Grade)}>
                        {GRADES.map(g => <option key={g} value={g}>{g} de Primària</option>)}
                      </select>
                    </div>

                    <div className="md:col-span-8 space-y-10">
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2 mb-6">Àrees Implicades</label>
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
                       <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400">Nom de la Situació d'Aprenentatge</label>
                    </div>
                    <div className="flex gap-4 items-center">
                      <input className="flex-1 text-2xl md:text-4xl font-black outline-none border-b-4 border-slate-50 py-4 focus:border-blue-600 bg-transparent transition-all placeholder:text-slate-100 text-slate-900" placeholder="Ex: El misteri de l'aigua..." value={title} onChange={e => setTitle(e.target.value)} />
                      <button onClick={handleInspiration} disabled={inspirationLoading} className="bg-slate-900 text-white p-5 rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50">
                        {inspirationLoading ? <Loader2 size={24} className="animate-spin" /> : <Wand2 size={24} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3 ml-2">
                       <Target size={20} className="text-blue-600" />
                       <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400">Descripció, Context i Producte Final</label>
                    </div>
                    <div className="relative">
                      {isGeneratingDescription && (
                        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-blue-200">
                          <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
                          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 animate-pulse">L'IA està redactant la proposta...</span>
                        </div>
                      )}
                      <textarea className="w-full bg-slate-50 p-10 rounded-[2.5rem] font-bold min-h-[300px] outline-none border border-slate-100 focus:border-blue-200 transition-all leading-relaxed text-slate-700 text-lg shadow-inner placeholder:text-slate-200" placeholder="Descriu breument de què tracta la SA, quin és el repte inicial i quin serà el producte final..." value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-10 border-t border-slate-50">
                    <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black uppercase tracking-widest text-[10px] transition-colors"><ArrowLeft size={16} /> Cancel·lar</button>
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
                        <p className="text-blue-100 text-sm font-bold">L'IA cercarà els elements del Decret 175/2022 més adients per a la teva SA.</p>
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

                  <div className="space-y-10">
                    {detailedActivities.length > 0 ? detailedActivities.map((session, idx) => (
                      <div key={idx} className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden hover:border-blue-100 transition-all shadow-sm">
                        <div className="bg-slate-900 px-10 py-6 flex flex-col md:flex-row justify-between items-start md:items-center text-white gap-4">
                          <div className="flex items-center gap-4 w-full">
                            <span className="bg-white/10 px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest">Sessió {idx + 1}</span>
                            <input className="bg-transparent font-black text-white text-xl outline-none border-b border-transparent focus:border-blue-400 placeholder:opacity-40 flex-1" placeholder="Títol de la sessió..." value={session.title} onChange={e => {
                              const copy = [...detailedActivities];
                              copy[idx].title = e.target.value;
                              setDetailedActivities(copy);
                            }} />
                          </div>
                        </div>
                        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                              <span className="block text-[10px] font-black uppercase text-blue-600 tracking-widest ml-2">Objectiu d'Aprenentatge</span>
                              <textarea className="w-full bg-slate-50 p-6 rounded-2xl text-base font-bold text-slate-800 outline-none focus:bg-white transition-all border border-slate-100 focus:border-blue-100 shadow-inner" rows={3} value={session.objective} onChange={e => {
                                const copy = [...detailedActivities];
                                copy[idx].objective = e.target.value;
                                setDetailedActivities(copy);
                              }} />
                            </div>
                            <div className="space-y-4">
                              <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Data prevista</span>
                              <input 
                                type="date" 
                                className="w-full bg-slate-50 p-6 rounded-2xl text-base font-black text-slate-800 outline-none focus:bg-white transition-all border border-slate-100 focus:border-blue-100 shadow-inner" 
                                value={sessionDates[idx] || ''} 
                                onChange={e => {
                                  const newDates = [...sessionDates];
                                  newDates[idx] = e.target.value;
                                  setSessionDates(newDates);
                                }} 
                              />
                            </div>
                            <div className="md:col-span-2 space-y-4">
                              <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Desenvolupament (Activitats)</span>
                              <textarea className="w-full bg-slate-50 p-8 rounded-[2rem] text-base font-medium text-slate-700 outline-none focus:bg-white transition-all border border-slate-100 focus:border-blue-100 shadow-inner leading-relaxed" rows={8} value={session.steps} onChange={e => {
                                const copy = [...detailedActivities];
                                copy[idx].steps = e.target.value;
                                setDetailedActivities(copy);
                              }} />
                            </div>
                            <div className="md:col-span-2 space-y-4">
                              <span className="block text-[10px] font-black uppercase text-indigo-600 tracking-widest ml-2 flex items-center gap-2"><Sparkles size={14} /> Pautes i Mesures DUA</span>
                              <textarea className="w-full bg-indigo-50/30 p-8 rounded-[2rem] text-base font-bold text-indigo-900/70 outline-none focus:bg-white transition-all border border-indigo-100 focus:border-indigo-400 shadow-inner leading-relaxed italic" rows={4} value={session.dua} onChange={e => {
                                const copy = [...detailedActivities];
                                copy[idx].dua = e.target.value;
                                setDetailedActivities(copy);
                              }} />
                            </div>
                        </div>
                      </div>
                    )) : (
                      <div className="py-40 text-center border-2 border-dashed border-slate-50 rounded-[3rem] bg-white">
                        <p className="text-slate-300 font-black uppercase tracking-[0.2em] text-[11px]">Utilitza la IA per dissenyar la seqüència o afegeix sessions manualment</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-10 border-t border-slate-50">
                    <button onClick={() => setActiveTab('curriculum')} className="text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-900 transition-colors">Enrere</button>
                    <button onClick={() => setActiveTab('evaluation')} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center gap-3 hover:bg-black shadow-lg transition-all active:scale-95">Següent: Avaluació <ChevronRight size={16} /></button>
                  </div>
                </div>
              )}

              {activeTab === 'evaluation' && (
                <div className="animate-fade-in space-y-12">
                  <div className="space-y-8 bg-blue-50/30 p-10 rounded-[2.5rem] border border-blue-100">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex-1">
                        <h4 className="font-black text-2xl text-blue-900 tracking-tight">Estratègia d'Avaluació</h4>
                        <p className="text-blue-700 font-bold text-sm">Selecciona els instruments que t'ajudaran a avaluar els criteris triats.</p>
                      </div>
                      <button onClick={handleSuggestEvalTools} disabled={evalLoading} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-black uppercase text-[11px] tracking-widest flex items-center gap-3 shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all">
                        {evalLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} Suggerir Instruments
                      </button>
                    </div>

                    {suggestedEvaluationTools.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {suggestedEvaluationTools.map((tool, idx) => (
                          <label key={idx} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${evaluationTools.includes(tool) ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-50 hover:border-blue-200'}`}>
                            <input 
                              type="checkbox" 
                              checked={evaluationTools.includes(tool)} 
                              onChange={() => setEvaluationTools(prev => prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool])}
                              className="w-5 h-5 accent-blue-600"
                            />
                            <span className="font-bold text-slate-800 text-xs">{tool}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    <div className="pt-6 border-t border-blue-100 flex justify-end">
                      <button onClick={handleGenerateSelectedToolContent} disabled={evaluationTools.length === 0 || generatingToolContent} className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center gap-3 shadow-xl hover:bg-black disabled:opacity-50 transition-all">
                        {generatingToolContent ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} Generar Contingut d'Avaluació
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {evaluationTools.map((tool, idx) => (
                      <div key={idx} className="bg-white border border-slate-100 rounded-[2.5rem] p-10 hover:border-blue-200 transition-all shadow-sm flex flex-col min-h-[400px]">
                        <div className="flex justify-between items-center mb-6">
                          <h5 className="font-black text-blue-700 uppercase tracking-widest text-[10px] bg-blue-50 px-4 py-2 rounded-lg">{tool}</h5>
                          <button onClick={() => setEvaluationTools(p => p.filter(t => t !== tool))} className="text-slate-200 hover:text-red-500 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="prose prose-slate max-w-none text-slate-800 font-medium overflow-auto max-h-[500px] text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: evaluationToolsContent[tool] || '<p class="text-slate-300 italic animate-pulse">Prement el botó superior, l\'IA redactarà aquest instrument...</p>' }} />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-10 border-t border-slate-50">
                    <button onClick={() => setActiveTab('sequence')} className="text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-900 transition-colors">Enrere</button>
                    <button onClick={handleSave} className="bg-blue-600 text-white px-16 py-6 rounded-[2rem] font-black uppercase text-[12px] tracking-[0.2em] flex items-center gap-4 hover:bg-blue-700 shadow-2xl shadow-blue-200 active:scale-95 transition-all"><Save size={24} /> Guardar Situació d'Aprenentatge</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal d'Inspiració */}
      {showInspirationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-[3rem] p-12 max-w-2xl w-full shadow-2xl animate-scale-in relative border border-blue-50">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-6">
                <div className="bg-blue-100 text-blue-600 p-4 rounded-2xl"><Lightbulb size={32} /></div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Idees i Enfocaments</h2>
                  <p className="text-slate-400 font-bold">Tria una proposta per començar a treballar.</p>
                </div>
              </div>
              <button onClick={() => setShowInspirationModal(false)} className="text-slate-300 hover:text-slate-900 transition-colors"><X size={32} /></button>
            </div>
            
            <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
              {inspirationOptions.map((opt, i) => (
                <button 
                  key={i} 
                  onClick={() => selectInspiration(opt.title)} 
                  className="w-full text-left p-6 bg-slate-50/50 border-2 border-slate-50 rounded-2xl hover:border-blue-400 hover:bg-white transition-all group flex items-center justify-between"
                >
                  <div>
                    <span className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">{opt.title}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 px-2 py-1 rounded-md mt-2 block w-fit">{opt.style}</span>
                  </div>
                  <ChevronRight size={20} className="text-slate-200 group-hover:text-blue-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-10 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl z-[300] animate-slide-up flex items-center gap-4 border-2 ${notification.type === 'success' ? 'bg-slate-900 text-white border-slate-800' : 'bg-red-600 text-white border-red-500'}`}>
          {notification.type === 'success' ? <Check size={20} className="text-blue-400" /> : <AlertCircle size={20} />}
          {notification.message}
        </div>
      )}

      {viewingActivity && <ActivityDetailsModal activity={viewingActivity} onClose={() => setViewingActivity(null)} activitySubjectIds={viewingActivity.subjectIds} onDelete={id => setActivities(p => p.filter(a => a.id !== id))} showNotification={showNotification} />}
      
      <footer className="bg-white border-t border-slate-100 py-10 mt-auto shrink-0">
        <div className="max-w-[1400px] mx-auto px-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Desenvolupat per</span>
            <span className="text-lg font-black text-slate-800">Servei Educatiu Vallès Occidental VIII</span>
          </div>
          <div className="flex items-center gap-8 text-slate-300">
             <School size={24} />
             <div className="h-8 w-px bg-slate-100"></div>
             <div className="flex items-center gap-2">
               <button onClick={handleExport} title="Exportar dades" className="p-3 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-all"><Download size={20} /></button>
               <button onClick={() => fileInputRef.current?.click()} title="Importar dades" className="p-3 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-all"><Upload size={20} /></button>
               <input type="file" ref={fileInputRef} onChange={handleImport} accept="application/json" style={{ display: 'none' }} />
             </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes slideUp {
          from { transform: translate(-50%, 40px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
