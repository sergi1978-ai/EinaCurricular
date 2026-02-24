
import { 
  BookOpen, Compass, BookText, Type, Languages, 
  Divide, Palette, Dumbbell, HeartHandshake, Feather, 
  Cpu, Users2, Zap, Smile, Rocket, GraduationCap
} from 'lucide-react';
import React from 'react';
import { SubjectOption, Grade } from './types';

export const SUBJECTS: SubjectOption[] = [
  { id: 'medi', name: 'Coneixement del Medi Natural, Social i Cultural', color: 'emerald', isTransversal: false },
  { id: 'catala', name: 'Llengua Catalana i Literatura', color: 'orange', isTransversal: false },
  { id: 'castella', name: 'Llengua Castellana i Literatura', color: 'amber', isTransversal: false },
  { id: 'angles', name: 'Llengua Estrangera (Anglès)', color: 'purple', isTransversal: false },
  { id: 'matematiques', name: 'Matemàtiques', color: 'blue', isTransversal: false },
  { id: 'artistica', name: 'Educació Artística (Plàstica, Música i Dansa)', color: 'rose', isTransversal: false },
  { id: 'fisica', name: 'Educació Física', color: 'cyan', isTransversal: false },
  { id: 'valors', name: 'Educació en Valors Cívics i Ètics', color: 'teal', isTransversal: false },
  { id: 'aranes', name: "Aranès i Literatura a l'Aran", color: 'red', isTransversal: false }
];

export const TRANSVERSAL_COMPETENCIES: SubjectOption[] = [
  { id: 'digital', name: 'Competència Digital', color: 'slate', isTransversal: true },
  { id: 'ciutadana', name: 'Competència Ciutadana', color: 'indigo', isTransversal: true },
  { id: 'emprenedora', name: 'Competència Emprenedora', color: 'violet', isTransversal: true },
  { id: 'personal', name: "Competència Personal, Social i d'Aprendre a Aprendre", color: 'fuchsia', isTransversal: true },
];

export const ALL_AREAS = [...SUBJECTS, ...TRANSVERSAL_COMPETENCIES];

export const GRADES = [
  Grade.First,
  Grade.Second,
  Grade.Third,
  Grade.Fourth,
  Grade.Fifth,
  Grade.Sixth
];

export const SCHOOL_YEARS = [
  '2025-2026',
  '2026-2027',
  '2027-2028'
];

export const SUBJECT_ICONS: Record<string, React.ReactNode> = {
  medi: React.createElement(Compass, { size: 20 }),
  catala: React.createElement(BookText, { size: 20 }),
  castella: React.createElement(Type, { size: 20 }),
  angles: React.createElement(Languages, { size: 20 }),
  matematiques: React.createElement(Divide, { size: 20 }),
  artistica: React.createElement(Palette, { size: 20 }),
  fisica: React.createElement(Dumbbell, { size: 20 }),
  valors: React.createElement(HeartHandshake, { size: 20 }),
  aranes: React.createElement(Feather, { size: 20 }),
  digital: React.createElement(Cpu, { size: 20 }),
  ciutadana: React.createElement(Users2, { size: 20 }),
  emprenedora: React.createElement(Zap, { size: 20 }),
  personal: React.createElement(Smile, { size: 20 }),
  default: React.createElement(GraduationCap, { size: 20 })
};

export const COLOR_MAP: Record<string, { bg: string, text: string, border: string, hoverBorder: string, lightBg: string }> = {
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-600', hoverBorder: 'hover:border-emerald-200', lightBg: 'bg-emerald-100' },
  orange: { bg: 'bg-orange-600', text: 'text-orange-600', border: 'border-orange-600', hoverBorder: 'hover:border-orange-200', lightBg: 'bg-orange-100' },
  amber: { bg: 'bg-amber-600', text: 'text-amber-600', border: 'border-amber-600', hoverBorder: 'hover:border-amber-200', lightBg: 'bg-amber-100' },
  purple: { bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-600', hoverBorder: 'hover:border-purple-200', lightBg: 'bg-purple-100' },
  blue: { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600', hoverBorder: 'hover:border-blue-200', lightBg: 'bg-blue-100' },
  rose: { bg: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-600', hoverBorder: 'hover:border-rose-200', lightBg: 'bg-rose-100' },
  cyan: { bg: 'bg-cyan-600', text: 'text-cyan-600', border: 'border-cyan-600', hoverBorder: 'hover:border-cyan-200', lightBg: 'bg-cyan-100' },
  teal: { bg: 'bg-teal-600', text: 'text-teal-600', border: 'border-teal-600', hoverBorder: 'hover:border-teal-200', lightBg: 'bg-teal-100' },
  red: { bg: 'bg-red-600', text: 'text-red-600', border: 'border-red-600', hoverBorder: 'hover:border-red-200', lightBg: 'bg-red-100' },
  slate: { bg: 'bg-slate-600', text: 'text-slate-600', border: 'border-slate-600', hoverBorder: 'hover:border-slate-200', lightBg: 'bg-slate-100' },
  indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-600', hoverBorder: 'hover:border-indigo-200', lightBg: 'bg-indigo-100' },
  violet: { bg: 'bg-violet-600', text: 'text-violet-600', border: 'border-violet-600', hoverBorder: 'hover:border-violet-200', lightBg: 'bg-violet-100' },
  fuchsia: { bg: 'bg-fuchsia-600', text: 'text-fuchsia-600', border: 'border-fuchsia-600', hoverBorder: 'hover:border-fuchsia-200', lightBg: 'bg-fuchsia-100' },
};
