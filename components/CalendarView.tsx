
import React, { useState, useMemo } from 'react';
import { Activity } from '../types';
import { SCHOOL_YEARS } from '../constants';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, X } from 'lucide-react';

interface CalendarViewProps {
  activities: Activity[];
  onEditActivity: (id: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ activities, onEditActivity }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterActivityId, setFilterActivityId] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthName = currentDate.toLocaleString('ca-ES', { month: 'long' });
  const year = currentDate.getFullYear();

  const sessionsByDate = useMemo(() => {
    const map: Record<string, { activityId: string; activityTitle: string; sessionTitle: string; sessionIdx: number; totalSessions: number; color?: string }[]> = {};
    
    activities.forEach(activity => {
      const matchesActivity = filterActivityId === 'all' || activity.id === filterActivityId;
      const matchesYear = filterYear === 'all' || activity.schoolYear === filterYear;

      if (matchesActivity && matchesYear && activity.sessionDates) {
        activity.sessionDates.forEach((date, idx) => {
          if (date) {
            if (!map[date]) map[date] = [];
            const session = activity.detailedActivities[idx];
            map[date].push({
              activityId: activity.id,
              activityTitle: activity.title,
              sessionTitle: session ? session.title : `Sessió ${idx + 1}`,
              sessionIdx: idx,
              totalSessions: activity.detailedActivities.length,
              color: activity.color
            });
          }
        });
      }
    });
    return map;
  }, [activities, filterActivityId, filterYear]);

  const calendarDays = useMemo(() => {
    const totalDays = daysInMonth(year, currentDate.getMonth());
    const startOffset = (firstDayOfMonth(year, currentDate.getMonth()) + 6) % 7;
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);
    return days;
  }, [year, currentDate]);

  const weekDays = ['dl', 'dt', 'dm', 'dj', 'dv', 'ds', 'dg'];

  return (
    <div className="max-w-full mx-auto px-4 py-6 animate-fade-in">
      <div className="mb-6 flex flex-wrap items-center gap-3 bg-white p-5 rounded-[1.5rem] border border-gray-200 shadow-sm">
        <div className="flex items-center gap-1.5 text-blue-600 font-black text-xs uppercase tracking-widest mr-3">
          <Filter size={16} />
          <span>Filtres</span>
        </div>
        <div className="flex-1 min-w-[180px]">
          <select value={filterActivityId} onChange={(e) => setFilterActivityId(e.target.value)} className="w-full text-xs font-bold border-gray-100 rounded-lg bg-gray-50 focus:ring-blue-500 py-2.5 px-3 outline-none">
            <option value="all">Totes les activitats</option>
            {activities.map(act => <option key={act.id} value={act.id}>{act.title}</option>)}
          </select>
        </div>
        {(filterActivityId !== 'all' || filterYear !== 'all') && (
          <button onClick={() => {setFilterActivityId('all'); setFilterYear('all');}} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 bg-red-50 px-4 py-2.5 rounded-lg transition-all">
            <X size={12} /> Netejar
          </button>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-200 overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between bg-slate-50/70 gap-5">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md"><CalendarIcon size={20} /></div>
            <div>
              <h2 className="text-xl font-black text-gray-900 capitalize tracking-tight">{monthName} {year}</h2>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-0.5">Calendari de sessions</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={prevMonth} className="p-2.5 hover:bg-white rounded-lg border border-gray-200 transition-all active:scale-95 shadow-sm bg-white/50"><ChevronLeft size={18} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-5 py-2.5 text-xs font-black uppercase tracking-widest bg-white hover:bg-slate-50 rounded-lg border border-gray-200 transition-all active:scale-95 shadow-sm">Avui</button>
            <button onClick={nextMonth} className="p-2.5 hover:bg-white rounded-lg border border-gray-200 transition-all active:scale-95 shadow-sm bg-white/50"><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-gray-100 bg-slate-50/50">
          {weekDays.map(day => <div key={day} className="py-3.5 text-center text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-r border-gray-100 last:border-r-0">{day}</div>)}
        </div>

        <div className="grid grid-cols-7 auto-rows-[minmax(120px,_auto)]">
          {calendarDays.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} className="bg-gray-50/10 border-r border-b border-gray-100 last:border-r-0"></div>;
            const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const sessions = sessionsByDate[dateStr] || [];
            const isToday = new Date().toDateString() === new Date(year, currentDate.getMonth(), day).toDateString();

            return (
              <div key={day} className={`p-2.5 border-r border-b border-gray-100 last:border-r-0 group hover:bg-slate-50/20 transition-all ${isToday ? 'bg-blue-50/20' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-black w-7 h-7 flex items-center justify-center rounded-lg ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>{day}</span>
                </div>
                <div className="space-y-1.5">
                  {sessions.map((s, sIdx) => (
                    <button 
                      key={sIdx} 
                      onClick={() => onEditActivity(s.activityId)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-all hover:brightness-95 active:scale-[0.97] shadow-sm bg-white border-slate-100`}
                    >
                      <div className="flex justify-between items-center gap-1.5 mb-1">
                        <div className="text-[7px] font-black truncate uppercase tracking-widest text-blue-600 opacity-80">{s.activityTitle}</div>
                        <div className="text-[7px] font-black text-slate-400 bg-slate-100 px-1 py-0.5 rounded-md shrink-0">{s.sessionIdx + 1}/{s.totalSessions}</div>
                      </div>
                      <div className="text-[10px] font-black truncate leading-tight text-slate-900">{s.sessionTitle}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
