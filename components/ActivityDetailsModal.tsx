
import React, { useState } from 'react';
import { Activity } from '../types';
import { 
  X, Layers, FileText, Trash2, ClipboardCheck, AlertTriangle, Sparkles, Copy, Check, Target, Lightbulb, TrendingUp, BookOpen, Handshake, ScrollText
} from 'lucide-react';
import { SUBJECT_ICONS } from '../constants'; // Import SUBJECT_ICONS from constants

interface ActivityDetailsModalProps {
  activity: Activity;
  onClose: () => void;
  activitySubjectIds: string[]; // Changed from subjectIcon
  onDelete?: (id: string) => void;
  showNotification: (message: string, type: 'error' | 'success') => void;
}

// Helper function to convert basic Markdown to HTML
const markdownToHtml = (markdownText: string | null | undefined): string => {
  if (markdownText === null || markdownText === undefined) return '';

  const textToProcess = String(markdownText); // Ensure it's a string before calling replace

  let html = textToProcess
    // Bold: **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic: *text*
    .replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Lists: - item or * item
  const lines = html.split('\n');
  let inList = false;
  let processedLines: string[] = [];

  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      if (!inList) {
        processedLines.push('<ul>');
        inList = true;
      }
      processedLines.push(`<li>${trimmedLine.substring(2).trim()}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (trimmedLine) {
        processedLines.push(`<p>${trimmedLine}</p>`);
      }
    }
  });

  if (inList) {
    processedLines.push('</ul>');
  }

  return processedLines.join('\n');
};

const ActivityDetailsModal: React.FC<ActivityDetailsModalProps> = ({ activity, onClose, activitySubjectIds, onDelete, showNotification }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const activityColor = activity.color ? activity.color.replace('emerald', 'blue') : 'bg-blue-600'; 
  const textCol = activityColor.replace('bg-', 'text-');
  const lightBg = activityColor.replace('bg-', 'bg-').replace('-600', '-50').replace('-700', '-50');

  const typeLabelMap = {
    'competencia': 'Competència Específica',
    'criteri': 'Criteri d\'Avaluació',
    'saber': 'Saber Bàsic'
  }

  const copyToGoogleDocs = async () => {
    const renderMarkdownForCopy = (text: string) => {
        // Simple Markdown to HTML for copying, focusing on lists
        let content = String(text) // Ensure text is a string
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Convert markdown lists to HTML lists
        const listRegex = /^\s*[\*-]\s+(.*)$/gm;
        if (content.match(listRegex)) {
            content = content.replace(listRegex, '<li>$1</li>');
            content = `<ul>${content}</ul>`;
        }
        return content.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('');
    };

    const htmlContent = `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; color: #1e293b; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1e293b; text-align: center; font-size: 28pt; font-weight: 800; margin-bottom: 10pt; line-height: 1.2;">${activity.title}</h1>
        <p style="text-align: center; color: #2563eb; font-size: 14pt; font-weight: bold; margin-bottom: 40pt;">
          ${activity.grade} de Primària • ${activity.subject}
        </p>
        
        <h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 8pt; margin-top: 35pt; font-size: 18pt; font-weight: 700;">1. Contextualització i Repte</h2>
        <div style="padding: 20pt; border-left: 6px solid #2563eb; background-color: #f8fafc; font-style: italic; margin-bottom: 30pt; font-size: 12pt; line-height: 1.7;">
          ${renderMarkdownForCopy(activity.description || '')}
        </div>
        
        <h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 8pt; margin-top: 45pt; font-size: 18pt; font-weight: 700;">2. Marc Curricular (Decret 175/2022)</h2>
        
        <h3 style="color: #1e293b; font-size: 15pt; margin-top: 25pt; margin-bottom: 10pt;">Competències Específiques</h3>
        <ul style="margin-bottom: 25pt; font-size: 11.5pt; padding-left: 25px;">
          ${(activity.competencies || []).map(c => `<li style="margin-bottom: 8pt;"><strong>${c.code}:</strong> ${c.text}</li>`).join('')}
        </ul>
        
        <h3 style="color: #1e293b; font-size: 15pt; margin-top: 25pt; margin-bottom: 10pt;">Criteris d'Avaluació</h3>
        <ul style="margin-bottom: 25pt; font-size: 11.5pt; padding-left: 25px;">
          ${(activity.criteria || []).map(c => `<li style="margin-bottom: 8pt;"><strong>${c.code}:</strong> ${c.text}</li>`).join('')}
        </ul>
        
        <h3 style="color: #1e293b; font-size: 15pt; margin-top: 25pt; margin-bottom: 10pt;">Sabers Bàsics</h3>
        <ul style="margin-bottom: 30pt; font-size: 11.5pt; padding-left: 25px;">
          ${(activity.sabers || []).map(c => `<li style="margin-bottom: 8pt;"><strong>${c.code}:</strong> ${c.text}</li>`).join('')}
        </ul>

        <h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 8pt; margin-top: 50pt; font-size: 18pt; font-weight: 700;">3. Seqüència Didàctica</h2>
        ${(activity.detailedActivities || []).map((s, i) => `
          <div style="margin-bottom: 35pt; padding: 25pt; border: 1px solid #e2e8f0; border-radius: 12pt; background-color: #fcfdfe;">
            <p style="font-weight: 800; color: #1e293b; margin-bottom: 12pt; font-size: 14pt; line-height: 1.3;">Sessió ${i + 1}: ${s.title} ${activity.sessionDates?.[i] ? `<span style="color: #64748b; font-weight: normal; font-size: 12pt;">(${new Date(activity.sessionDates[i]).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })})</span>` : ''}</p>
            
            <p style="font-size: 11.5pt; margin-bottom: 10pt;"><strong><span style="color: #2563eb;">Objectiu:</span></strong> ${s.objective}</p>
            <p style="font-size: 11.5pt; margin-bottom: 10pt;"><strong><span style="color: #4f46e5;">Metodologia:</span></strong> ${s.methodology}</p>
            
            <div style="margin-top: 15pt; margin-bottom: 15pt; padding-top: 15pt; border-top: 1px solid #f1f5f9;">
              <p style="font-size: 11.5pt; margin-bottom: 8pt;"><strong><span style="color: #334155;">Desenvolupament Detallat:</span></strong></p>
              <div style="font-size: 11.5pt; line-height: 1.6;">${renderMarkdownForCopy(s.steps || '')}</div>
            </div>

            <div style="margin-top: 15pt; margin-bottom: 15pt; padding-top: 15pt; border-top: 1px solid #f1f5f9;">
              <p style="font-size: 11.5pt; margin-bottom: 8pt;"><strong><span style="color: #4f46e5;">Mesures DUA:</span></strong></p>
              <div style="font-size: 11.5pt; line-height: 1.6; background-color: #eef2ff; padding: 12px; border-radius: 8px; border: 1px solid #c7d2fe;">${renderMarkdownForCopy(s.dua || '')}</div>
            </div>
            
            <p style="font-size: 11.5pt; margin-top: 15pt; padding-top: 15pt; border-top: 1px solid #f1f5f9;"><strong><span style="color: #f59e0b;">Avaluació a la Sessió:</span></strong> ${s.evaluation}</p>
          </div>
        `).join('')}

        <h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 8pt; margin-top: 50pt; font-size: 18pt; font-weight: 700;">4. Instruments d'Avaluació</h2>
        ${(activity.evaluationTools || []).map(tool => `
          <div style="margin-bottom: 35pt;">
            <h3 style="color: #2563eb; font-size: 15pt; margin-bottom: 15pt; padding-bottom: 5pt; border-bottom: 1px solid #e2e8f0;">${tool}</h3>
            <div style="font-size: 11.5pt; line-height: 1.6;">
              ${activity.evaluationToolsContent?.[tool] || '<p style="color: #94a3b8; font-style: italic;">Contingut no disponible.</p>'}
            </div>
          </div>
        `).join('')}

        <div style="margin-top: 70pt; border-top: 1px solid #e2e8f0; padding-top: 20pt; text-align: center; color: #94a3b8; font-size: 9pt;">
          Dissenyat pel Servei Educatiu Vallès Occidental VIII
        </div>
      </div>
    `;

    try {
      const type = "text/html";
      const blob = new Blob([htmlContent], { type });
      const data = [new ClipboardItem({ [type]: blob })];
      await navigator.clipboard.write(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      showNotification("Contingut copiat al porta-retalls per a Google Docs", "success");
    } catch (err) {
      console.error("Error al copiar:", err);
      // Fallback a text pla si la còpia HTML falla
      const plainText = `
        ${activity.title}
        ${activity.grade} de Primària • ${activity.subject}

        1. Contextualització i Repte
        ${activity.description}

        2. Marc Curricular (Decret 175/2022)
        Competències Específiques:
        ${(activity.competencies || []).map(c => `${c.code}: ${c.text}`).join('\n')}

        Criteris d'Avaluació:
        ${(activity.criteria || []).map(c => `${c.code}: ${c.text}`).join('\n')}

        Sabers Bàsics:
        ${(activity.sabers || []).map(c => `${c.code}: ${c.text}`).join('\n')}

        3. Seqüència Didàctica
        ${(activity.detailedActivities || []).map((s, i) => `
          Sessió ${i + 1}: ${s.title} ${activity.sessionDates?.[i] ? `(${new Date(activity.sessionDates[i]).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })})` : ''}
          Objectiu: ${s.objective}
          Metodologia: ${s.methodology}
          Desenvolupament Detallat: ${s.steps}
          Mesures DUA: ${s.dua}
          Avaluació a la Sessió: ${s.evaluation}
        `).join('\n\n')}

        4. Instruments d'Avaluació
        ${(activity.evaluationTools || []).map(tool => `
          ${tool}:
          ${activity.evaluationToolsContent?.[tool] || 'Contingut no disponible.'}
        `).join('\n\n')}

        Creat pel Servei Educatiu Vallès Occidental VIII
      `;
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      showNotification("Error al copiar l'HTML, s'ha copiat el text pla.", "error");
    }
  };

  const confirmDelete = () => {
    if (onDelete) {
      onDelete(activity.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-lg animate-fade-in overflow-hidden">
      <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col animate-scale-in relative border border-slate-200/50">
        
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-[210] bg-slate-900/70 backdrop-blur-xl flex items-center justify-center p-5">
            <div className="bg-white rounded-[3rem] p-12 max-w-sm w-full shadow-2xl text-center border border-slate-100 animate-scale-in">
              <div className="bg-red-50 text-red-500 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
                <AlertTriangle size={48} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Vols eliminar-la?</h3>
              <p className="text-slate-500 font-medium mb-10 leading-relaxed text-base">
                S'eliminarà permanentment la SA <span className="font-extrabold text-slate-900">"{activity.title}"</span>.
              </p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmDelete} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-red-700 transition-all shadow-lg active:scale-95">
                  Confirmar Eliminació
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className="w-full bg-slate-100 text-slate-600 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-200 transition-all">
                  Cancel·lar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className={`px-12 py-8 border-b border-slate-100 flex justify-between items-center ${lightBg} gap-10 shrink-0`}>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-3 mb-4">
              <span className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white ${textCol} shadow-sm border border-slate-50`}>
                {activity.grade} Primària
              </span>
              <span className="bg-white/60 backdrop-blur-sm px-5 py-2 rounded-xl text-[10px] font-extrabold text-slate-600 flex items-center gap-3 shadow-sm border border-white">
                <div className="flex gap-2"> {/* Container for multiple icons */}
                  {activitySubjectIds.map(id => (
                    <div key={id} className="text-blue-600">
                      {SUBJECT_ICONS[id] || <BookOpen size={20} />} {/* Fallback icon */}
                    </div>
                  ))}
                </div>
                <span className="uppercase tracking-widest">{activity.subject}</span>
              </span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 leading-tight tracking-tight break-words">{activity.title}</h2>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <button 
              onClick={copyToGoogleDocs} 
              className={`flex items-center justify-center gap-4 px-10 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 border-2 ${copied ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-900 text-white border-slate-900 hover:bg-black'}`}
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
              {copied ? 'Copiat!' : 'Copia per a Google Docs'}
            </button>
            <button onClick={onClose} className="p-4 text-slate-300 hover:text-slate-900 hover:bg-white rounded-full transition-all"><X size={36} /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-16 space-y-20 bg-slate-50 custom-scrollbar">
          
          <section>
            <div className={`flex items-center gap-4 bg-gradient-to-r from-blue-100 to-transparent pr-10 pl-8 py-5 rounded-[1.5rem] mb-10 border-l-[6px] border-blue-600`}>
              <FileText size={28} className="text-blue-700 shrink-0" />
              <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-blue-900 flex-grow">
                01. Contextualització i Repte
              </h3>
            </div>
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-inner relative overflow-hidden">
               <p className="text-slate-700 leading-relaxed font-medium italic text-lg markdown-content" dangerouslySetInnerHTML={{ __html: markdownToHtml(activity.description) }} />
            </div>
          </section>

          <section>
            <div className={`flex items-center gap-4 bg-gradient-to-r from-sky-100 to-transparent pr-10 pl-8 py-5 rounded-[1.5rem] mb-10 border-l-[6px] border-sky-600`}>
              <ScrollText size={28} className="text-sky-700 shrink-0" />
              <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-sky-900 flex-grow">
                02. Marc Curricular (Decret 175/2022)
              </h3>
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {[
               { title: 'Competències Específiques', items: activity.competencies || [], color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
               { title: 'Criteris d\'Avaluació', items: activity.criteria || [], color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
               { title: 'Sabers Bàsics', items: activity.sabers || [], color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' }
             ].map((sec, i) => (
               <div key={i} className="space-y-4 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-md">
                 <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${sec.color} px-3 py-1.5 rounded-lg w-fit bg-slate-50 border border-slate-100`}>{sec.title}</h4>
                 <div className="space-y-3">
                   {sec.items.map((c: any, cIdx: number) => (
                     <div key={c.id || cIdx} className={`p-4 ${sec.bg} border ${sec.border} rounded-2xl text-[14px] font-bold leading-relaxed text-slate-800 shadow-sm hover:shadow-md transition-shadow`}>
                        <span className="block text-[8px] font-black uppercase bg-white text-slate-500 px-2 py-0.5 rounded-md mb-1 w-fit border border-slate-100">
                          {typeLabelMap[c.type]}
                        </span>
                       <span className={`block mb-1 opacity-80 font-black tracking-tight text-[11px] ${sec.color}`}>{c.code}</span>
                       {c.text}
                     </div>
                   ))}
                 </div>
               </div>
             ))}
          </div>
          </section>

          {activity.detailedActivities && activity.detailedActivities.length > 0 && (
            <section>
              <div className={`flex items-center gap-4 bg-gradient-to-r from-indigo-100 to-transparent pr-10 pl-8 py-5 rounded-[1.5rem] mb-10 border-l-[6px] border-indigo-600`}>
                <Layers size={28} className="text-indigo-700 shrink-0" />
                <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-indigo-900 flex-grow">
                  03. Seqüència Didàctica Professional
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-10">
                {activity.detailedActivities.map((session, idx) => (
                  <div key={idx} className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-xl hover:shadow-2xl transition-all border-l-[10px] border-l-slate-900">
                    <div className="bg-slate-900 px-12 py-7 flex justify-between items-center text-white">
                      <div className="flex items-center gap-5">
                        <span className={`w-12 h-12 rounded-xl ${activityColor} flex items-center justify-center font-black text-xl shadow-lg`}>{idx + 1}</span>
                        <span className="font-extrabold text-xl tracking-tight uppercase">
                          {session.title} 
                          {activity.sessionDates?.[idx] && (
                            <span className="ml-3 text-slate-300 text-base font-medium">({new Date(activity.sessionDates[idx]).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })})</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="p-12 space-y-8">
                      {/* Objectiu d'Aprenentatge */}
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <span className="flex items-center gap-3 text-[10px] font-black uppercase text-blue-700 mb-3 tracking-widest">
                          <Target size={18} /> Objectiu d'Aprenentatge
                        </span>
                        <p className="text-slate-800 font-extrabold tracking-tight text-lg leading-snug">{session.objective}</p>
                      </div>

                      {/* Metodologia Principal */}
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <span className="flex items-center gap-3 text-[10px] font-black uppercase text-indigo-700 mb-3 tracking-widest">
                          <Lightbulb size={18} /> Metodologia Principal
                        </span>
                        <p className="font-bold text-indigo-700 leading-relaxed text-base">{session.methodology}</p>
                      </div>

                      {/* Desenvolupament Detallat */}
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <span className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-700 mb-3 tracking-widest">
                          <TrendingUp size={18} /> Desenvolupament Detallat
                        </span>
                        <div className="font-medium text-slate-600 leading-relaxed text-base markdown-content" dangerouslySetInnerHTML={{ __html: markdownToHtml(session.steps) }} />
                      </div>

                      {/* Mesures Inclusives i DUA */}
                      {session.dua && (
                        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
                          <span className="flex items-center gap-3 text-[10px] font-black uppercase text-indigo-800 mb-3 tracking-widest">
                            <Sparkles size={18} className="fill-current" /> Mesures Inclusives i DUA
                          </span>
                          <div className="text-base italic text-indigo-900 font-semibold leading-relaxed markdown-content" dangerouslySetInnerHTML={{ __html: markdownToHtml(session.dua) }} />
                        </div>
                      )}
                      
                      {/* Avaluació a la Sessió */}
                      <div className="bg-sky-50 p-6 rounded-2xl border border-sky-100 shadow-sm">
                        <span className="flex items-center gap-3 text-[10px] font-black uppercase text-sky-700 mb-3 tracking-widest">
                          <ClipboardCheck size={18} /> Avaluació a la Sessió
                        </span>
                        <p className="font-medium text-slate-600 leading-relaxed text-base">{session.evaluation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activity.evaluationTools && activity.evaluationTools.length > 0 && (
            <section>
              <div className={`flex items-center gap-4 bg-gradient-to-r from-blue-100 to-transparent pr-10 pl-8 py-5 rounded-[1.5rem] mb-10 border-l-[6px] border-blue-600`}>
                <Handshake size={28} className="text-blue-700 shrink-0" />
                <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-blue-900 flex-grow">
                  04. Instruments d'Avaluació Competencial
                </h3>
              </div>
              <div className="space-y-12">
                {activity.evaluationTools.map((tool, idx) => (
                  <div key={idx} className="bg-white border border-slate-100 rounded-[3rem] overflow-hidden shadow-xl">
                    <div className="bg-blue-600 p-8 flex justify-between items-center text-white">
                      <h5 className="font-black uppercase tracking-[0.2em] text-sm">{tool}</h5>
                      <ClipboardCheck size={24} />
                    </div>
                    <div className="p-12 prose prose-slate max-w-none overflow-x-auto">
                      <div className="evaluation-tool-preview" dangerouslySetInnerHTML={{ __html: activity.evaluationToolsContent?.[tool] || '' }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="pt-8 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
              Creat pel Servei Educatiu Vallès Occidental VIII
            </p>
          </div>
        </div>

        <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-between px-16 items-center shrink-0">
           <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-3 text-red-400 hover:text-red-600 text-[10px] font-extrabold uppercase tracking-widest transition-all hover:scale-105 active:scale-95">
             <Trash2 size={20} /> Eliminar Programació
           </button>
           <button onClick={onClose} className="bg-slate-900 text-white px-16 py-6 rounded-[1.5rem] font-extrabold uppercase tracking-widest text-xs shadow-xl hover:bg-black transition-all active:scale-95">
             Tancar Vista Detallada
           </button>
        </div>
      </div>

      <style>{`
        .evaluation-tool-preview table {
          width: 100%;
          border-collapse: collapse;
          margin: 25px 0;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
        }
        .evaluation-tool-preview th, .evaluation-tool-preview td {
          padding: 16px 20px;
          border: 1px solid #e2e8f0;
          text-align: left;
        }
        .evaluation-tool-preview th {
          background-color: #f8fafc;
          font-weight: 800;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.1em;
          color: #1e293b;
        }
        .evaluation-tool-preview td {
          font-size: 0.95rem;
          color: #475569;
          line-height: 1.5;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 16px;
          border: 2px solid #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Markdown specific styles */
        .markdown-content strong {
          font-weight: 800;
          color: #1e293b;
        }
        .markdown-content em {
          font-style: italic;
          color: #475569;
        }
        .markdown-content ul {
          list-style-type: disc;
          padding-left: 25px;
          margin-top: 10px;
          margin-bottom: 10px;
          color: #475569;
        }
        .markdown-content ul li {
          margin-bottom: 5px;
          line-height: 1.6;
        }
        .markdown-content p {
            margin-bottom: 10px;
        }
        .markdown-content p:last-child {
            margin-bottom: 0;
        }
      `}</style>
    </div>
  );
};

export default ActivityDetailsModal;