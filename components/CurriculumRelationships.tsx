
import React from 'react';
import { CurriculumItem, RelationshipMapItem } from '../types';
import { Link2, BookOpen, AlertCircle } from 'lucide-react';

interface CurriculumRelationshipsProps {
  mappingData: RelationshipMapItem[];
  allSabers: CurriculumItem[];
}

const CurriculumRelationships: React.FC<CurriculumRelationshipsProps> = ({ 
  mappingData, 
  allSabers 
}) => {
  if (mappingData.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-5 animate-fade-in">
      <div className="bg-gradient-to-r from-indigo-50 to-white px-5 py-3 border-b border-gray-100 flex items-center gap-2">
        <Link2 className="text-indigo-600" size={18} />
        <h3 className="font-bold text-gray-900 text-sm">Mapa de Relacions: Criteris ↔ Sabers</h3>
      </div>
      
      <div className="divide-y divide-gray-100">
        {mappingData.map((item, idx) => {
          // Find full saber objects based on codes returned by AI
          const connectedSabers = item.relatedSabers
            .map(code => allSabers.find(s => s.code.includes(code) || code.includes(s.code)))
            .filter(Boolean) as CurriculumItem[];

          return (
            <div key={idx} className="p-5 hover:bg-gray-50 transition-colors">
              <div className="mb-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-mono font-bold text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                    {item.criteriaCode}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Criteri d'Avaluació</span>
                </div>
                <p className="text-gray-900 font-medium text-sm leading-snug">
                  {item.criteriaText || "Text del criteri no disponible"}
                </p>
              </div>

              <div className="ml-3.5 pl-3.5 border-l-2 border-indigo-100 space-y-2.5">
                <div className="text-sm text-gray-600 italic flex items-start gap-1.5">
                   <span className="text-indigo-400 mt-0.5">↳</span> 
                   {item.justification}
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                  {connectedSabers.length > 0 ? (
                    connectedSabers.map((saber, sIdx) => (
                      <div 
                        key={sIdx} 
                        className="bg-blue-50 border border-blue-100 text-blue-900 rounded-md p-1.5 max-w-full sm:max-w-xs text-[11px] flex items-start gap-1.5"
                      >
                         <BookOpen size={12} className="shrink-0 mt-0.5 text-blue-400" />
                         <div>
                            <span className="font-bold block text-blue-700 mb-0.5">{saber.code}</span>
                            <span className="leading-tight block text-blue-800 opacity-90">{saber.text}</span>
                         </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <AlertCircle size={10} /> Cap saber seleccionat vinculat directament.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CurriculumRelationships;