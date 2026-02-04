
import { 
  BookOpen, Globe, Languages, Calculator, Palette, Bike, ShieldCheck, 
  Cpu, Target, Rocket, Brain 
} from 'lucide-react';
import React from 'react';
import { SubjectOption, Grade } from './types';

export const SUBJECTS: SubjectOption[] = [
  { id: 'medi', name: 'Coneixement del Medi Natural, Social i Cultural', isTransversal: false },
  { id: 'catala', name: 'Llengua Catalana i Literatura', isTransversal: false },
  { id: 'castella', name: 'Llengua Castellana i Literatura', isTransversal: false },
  { id: 'angles', name: 'Llengua Estrangera (Anglès)', isTransversal: false },
  { id: 'matematiques', name: 'Matemàtiques', isTransversal: false },
  { id: 'artistica', name: 'Educació Artística (Plàstica, Música i Dansa)', isTransversal: false },
  { id: 'fisica', name: 'Educació Física', isTransversal: false },
  { id: 'valors', name: 'Educació en Valors Cívics i Ètics', isTransversal: false },
  { id: 'aranes', name: "Aranès i Literatura a l'Aran", isTransversal: false }
];

export const TRANSVERSAL_COMPETENCIES: SubjectOption[] = [
  { id: 'digital', name: 'Competència Digital', isTransversal: true },
  { id: 'ciutadana', name: 'Competència Ciutadana', isTransversal: true },
  { id: 'emprenedora', name: 'Competència Emprenedora', isTransversal: true },
  { id: 'personal', name: "Competència Personal, Social i d'Aprendre a Aprendre", isTransversal: true },
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
  medi: React.createElement(Globe, { size: 20 }),
  catala: React.createElement(Languages, { size: 20 }),
  castella: React.createElement(Languages, { size: 20 }),
  angles: React.createElement(Languages, { size: 20 }),
  matematiques: React.createElement(Calculator, { size: 20 }),
  artistica: React.createElement(Palette, { size: 20 }),
  fisica: React.createElement(Bike, { size: 20 }),
  valors: React.createElement(ShieldCheck, { size: 20 }),
  aranes: React.createElement(Languages, { size: 20 }),
  digital: React.createElement(Cpu, { size: 20 }),
  ciutadana: React.createElement(Target, { size: 20 }),
  emprenedora: React.createElement(Rocket, { size: 20 }),
  personal: React.createElement(Brain, { size: 20 }),
  default: React.createElement(BookOpen, { size: 20 })
};
