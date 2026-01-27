

import React, { useRef, useState } from 'react';
import { CurriculumItem } from '../types';
import { GripVertical, X } from 'lucide-react';

interface SortableCurriculumListProps {
  title: string;
  items: CurriculumItem[];
  onReorder: (items: CurriculumItem[]) => void;
  onRemove: (item: CurriculumItem) => void;
  colorClass: string;
  borderColorClass: string;
}

const SortableCurriculumList: React.FC<SortableCurriculumListProps> = ({ 
  title, 
  items, 
  onReorder, 
  onRemove,
  colorClass,
  borderColorClass
}) => {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  if (items.length === 0) return null;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
    setIsDragging(true);
    // Required for Firefox
    e.dataTransfer.effectAllowed = 'move';
    // Create a ghost image if needed, or rely on browser default
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    e.preventDefault();
    dragOverItem.current = position;
    
    // Optional: Real-time reordering visual feedback could go here
    // But keeping it simple with onDragEnd for the state update is often more stable 
    // for simple lists, though let's try a live-swap for better UX.
    
    if (dragItem.current !== null && dragItem.current !== dragOverItem.current) {
      const _items = [...items];
      const draggedItemContent = _items[dragItem.current];
      _items.splice(dragItem.current, 1);
      _items.splice(dragOverItem.current, 0, draggedItemContent);
      
      dragItem.current = dragOverItem.current;
      onReorder(_items);
    }
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
    setIsDragging(false);
  };

  return (
    <div className={`mb-5 p-3 rounded-lg border bg-white ${borderColorClass}`}>
      <h4 className={`text-sm font-bold uppercase tracking-wider mb-2 flex items-center justify-between ${colorClass}`}>
        <span>{title}</span>
        <span className="text-xs font-normal opacity-70 bg-gray-100 px-2 py-1 rounded">
          {items.length} elements
        </span>
      </h4>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnter={(e) => handleDragEnter(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className={`
              flex items-start gap-2 p-2.5 rounded-md border border-gray-100 bg-white
              transition-all duration-200 cursor-move group hover:border-gray-300 hover:shadow-xs
              ${isDragging && dragItem.current === index ? 'opacity-50 scale-[0.99]' : 'opacity-100'}
            `}
          >
            <div className="mt-1 text-gray-400 group-hover:text-gray-600">
              <GripVertical size={14} />
            </div>
            <div className="flex-grow">
              <span className="font-bold text-[10px] block mb-0.5 opacity-70 text-gray-600">
                {item.code}
              </span>
              <p className="text-sm text-gray-800 leading-snug">
                {item.text}
              </p>
            </div>
            <button
              onClick={() => onRemove(item)}
              className="text-gray-300 hover:text-red-500 transition-colors p-1"
              title="Eliminar"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-center text-gray-400 mt-2 italic">
        Arrossega per ordenar la prioritat
      </p>
    </div>
  );
};

export default SortableCurriculumList;