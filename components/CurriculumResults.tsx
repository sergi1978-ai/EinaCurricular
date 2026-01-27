
import React, { useState, useEffect } from 'react';
import { AiResponse, CurriculumItem } from '../types';
import { Plus, Check, RefreshCw, Loader2, X } from 'lucide-react';

interface CurriculumResultsProps {
  data: AiResponse;
  selectedItems: CurriculumItem[];
  onToggleItem: (item: CurriculumItem) => void;
  onLoadMore?: (type: 'competencia' | 'criteri' | 'saber') => void;
  loadingSections?: { competencia: boolean; criteri: boolean; saber: boolean; };
}

const CurriculumResults: React.FC<CurriculumResultsProps> = ({ 
  data, 
  selectedItems, 
  onToggleItem,
  onLoadMore,
  loadingSections
}) => {
  const [localCompetencies, setLocalCompetencies] = useState(data.competencies);
  const [localCriteria, setLocalCriteria] = useState(data.criteria);
  const [localSabers, setLocalSabers] = useState(data.sabers);

  useEffect(() => {
    setLocalCompetencies(data.competencies);
    setLocalCriteria(data.criteria);
    setLocalSabers(data.sabers);
  }, [data]);

  const handleDiscardItem = (itemToDiscard: CurriculumItem) => {
    if (selectedItems.some(i => i.code === itemToDiscard.code && i.type === itemToDiscard.type)) {
      onToggleItem(itemToDiscard);
    }

    if (itemToDiscard.type === 'competencia') {
      setLocalCompetencies(prev => prev.filter(item => item.code !== itemToDiscard.code));
    } else if (itemToDiscard.type === 'criteri') {
      setLocalCriteria(prev => prev.filter(item => item.code !== itemToDiscard.code));
    } else if (itemToDiscard.type === 'saber') {
      setLocalSabers(prev => prev.filter(item => item.code !== itemToDiscard.code));
    }
  };
  
  const renderSection = (
    title: string, 
    items: { code: string; text: string }[] | undefined, 
    type: 'competencia' | 'criteri' | 'saber',
    bgColor: string,
    borderColor: string,
    textColor: string
  ) => {
    const isLoading = loadingSections ? loadingSections[type] : false;
    const safeItems = items || [];
    
    if (safeItems.length === 0 && !isLoading) return null;

    const typeLabelMap = {
      'competencia': 'Competència',
      'criteri': 'Criteri d\'Avaluació',
      'saber': 'Saber Bàsic'
    };

    return (
      <div className="mb-4 flex flex-col h-full animate-fade-in">
        <div className="flex justify-between items-center mb-3 px-2">
            <h4 className={`text-[10px] font-black uppercase tracking-[0.15em] ${textColor}`}>{title}</h4>
            {onLoadMore && (
                <button 
                    onClick={() => onLoadMore(type)}
                    disabled={isLoading}
                    className="text-[9px] font-bold flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                >
                    {isLoading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                    <span>Més</span>
                </button>
            )}
        </div>
        
        <div className="space-y-2.5 flex-grow">
          {safeItems.map((item, idx) => {
            const itemId = `${type}-${item.code}-${idx}`; 
            const isSelected = selectedItems.some(i => i.code === item.code && i.type === type);
            const fullItem: CurriculumItem = { id: itemId, code: item.code, text: item.text, type };

            return (
              <div 
                key={itemId}
                onClick={() => onToggleItem(fullItem)}
                className={`
                  relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 group
                  ${isSelected ? `${bgColor} ${borderColor} shadow-sm` : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md'}
                `}
              >
                <button
                    onClick={(e) => { e.stopPropagation(); handleDiscardItem(fullItem); }}
                    className="absolute top-2.5 right-2.5 p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Descartar suggeriment"
                >
                    <X size={12} />
                </button>

                <div className="flex items-start gap-3">
                  <div className={`
                    mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-all
                    ${isSelected ? `bg-white border-transparent shadow-xs` : 'border-slate-100 bg-slate-50 group-hover:border-slate-200'}
                  `}>
                    {isSelected && <Check size={12} className={textColor} strokeWidth={4} />}
                    {!isSelected && <Plus size={12} className="text-slate-300 opacity-0 group-hover:opacity-100" />}
                  </div>
                  <div className="flex-grow">
                    <span className="block text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md mb-1 w-fit">
                      {typeLabelMap[type]}
                    </span>
                    <span className={`font-black text-[9px] block mb-0.5 tracking-widest opacity-70 ${isSelected ? textColor : 'text-slate-500'}`}>
                      {item.code}
                    </span>
                    <p className={`text-sm leading-relaxed font-bold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                      {item.text}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {renderSection("Competències", localCompetencies, 'competencia', 'bg-blue-50', 'border-blue-200', 'text-blue-700')}
        {renderSection("Criteris d'Avaluació", localCriteria, 'criteri', 'bg-sky-50', 'border-sky-200', 'text-sky-700')}
        {renderSection("Sabers i Continguts", localSabers, 'saber', 'bg-indigo-50', 'border-indigo-200', 'text-indigo-700')}
      </div>
    </div>
  );
};

export default CurriculumResults;
