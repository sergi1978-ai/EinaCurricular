
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
