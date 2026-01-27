
import React from 'react';
import { Activity } from '../types';
import { 
  Pencil, Copy, Eye, BookOpen // Import BookOpen for default icon
} from 'lucide-react';
import { SUBJECT_ICONS } from '../constants'; // Import SUBJECT_ICONS from constants

interface ActivityCardProps {
  activity: Activity;
  activitySubjectIds: string[]; // Changed from subjectIcon
  onDelete: (id: string) => void;
  onEdit: () => void;
  onCopy: (activity: Activity) => void;
  onView: (activity: Activity) => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, activitySubjectIds, onEdit, onCopy, onView }) => {
  // Use blue colors for consistency with new theme
  const colorClass = activity.color ? activity.color.replace('emerald', 'blue') : 'bg-blue-600'; 
  const textClass = colorClass.replace('bg-', 'text-');
  const lightBgClass = colorClass.replace('bg-', 'bg-').replace('600', '100').replace('700', '100'); 

  const handleAction = (e: React.MouseEvent, callback: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
  };

  return (
    <div className="relative h-full group">
      {/* CAPA DE CONTROL - Accions ràpides */}
      <div className="absolute top-8 right-8 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
        <button 
          onClick={(e) => handleAction(e, () => onCopy(activity))} 
          className="p-3 bg-white rounded-xl shadow-md text-slate-400 hover:text-blue-600 border border-slate-100 transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
          title="Duplicar"
        >
          <Copy size={16} />
        </button>
        <button 
          onClick={(e) => handleAction(e, onEdit)} 
          className="p-3 bg-white rounded-xl shadow-md text-slate-400 hover:text-amber-600 border border-slate-100 transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
          title="Editar"
        >
          <Pencil size={16} />
        </button>
      </div>

      {/* COS DE LA TARGETA */}
      <div 
        onClick={() => onView(activity)}
        className="h-full bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)] hover:border-blue-100 transition-all duration-500 flex flex-col cursor-pointer active:scale-[0.985] group"
      >
        <div className={`h-3 w-full ${colorClass} opacity-80 group-hover:opacity-100 transition-opacity`}></div>
        
        <div className="p-8 flex flex-col h-full">
          <div className="mb-6 flex flex-col gap-2">
              <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[9px] font-extrabold uppercase tracking-[0.2em] ${lightBgClass} ${textClass} border border-current/10 w-fit`}>
                {activity.grade} Primària
              </span>
              <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">
                <div className="flex gap-1"> {/* Container for multiple icons */}
                  {activitySubjectIds.slice(0, 3).map(id => ( // Limit to 3 icons
                    <div key={id} className="text-blue-600">
                      {SUBJECT_ICONS[id] || <BookOpen size={16} />} {/* Fallback icon */}
                    </div>
                  ))}
                  {activitySubjectIds.length > 3 && (
                    <span className="text-blue-600 text-[10px] font-black leading-none flex items-center">+{activitySubjectIds.length - 3}</span>
                  )}
                </div>
                <span className="truncate max-w-[150px]">{activity.subject}</span>
              </div>
          </div>

          <h3 className="text-2xl font-extrabold text-slate-900 line-clamp-2 mb-4 tracking-tight leading-[1.2] group-hover:text-blue-700 transition-colors pr-10">
            {activity.title}
          </h3>
          
          <p className="text-slate-600 mb-8 text-sm font-medium line-clamp-3 leading-relaxed flex-grow opacity-90">
            {activity.description}
          </p>

          <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-auto">
             <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div title="Elements Curriculars" className="w-9 h-9 rounded-xl bg-blue-700 border-3 border-white flex items-center justify-center text-[10px] font-black text-white shadow-md">
                    {(activity.competencies?.length || 0) + (activity.criteria?.length || 0) + (activity.sabers?.length || 0)}
                  </div>
                </div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Items Vinculats</span>
             </div>
             <div className="flex items-center gap-1.5 text-blue-700 font-extrabold text-[9px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                <Eye size={14} /> Veure SA
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityCard;