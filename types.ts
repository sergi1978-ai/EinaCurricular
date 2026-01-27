
export enum Grade {
  First = '1r',
  Second = '2n',
  Third = '3r',
  Fourth = '4t',
  Fifth = '5è',
  Sixth = '6è'
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  schoolName?: string;
  defaultGrade: Grade;
  defaultSchoolYear: string;
  color: string;
  createdAt: number;
}

export interface Session {
  title: string;
  objective: string;
  methodology: string;
  steps: string;
  evaluation: string;
  dua: string;
}

export interface CurriculumItem {
  id: string;
  code: string; // e.g., "CE1", "Crit. 1.1"
  text: string;
  type: 'competencia' | 'criteri' | 'saber';
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  schoolYear: string; 
  grade: Grade;
  subject: string; // Display string (e.g. "Matemàtiques + Medi")
  subjectIds: string[]; // Logic IDs
  detailedActivities: Session[];
  sessionDates?: string[]; // ISO strings for each session
  competencies: CurriculumItem[];
  criteria: CurriculumItem[];
  sabers: CurriculumItem[];
  evaluationTools?: string[]; 
  evaluationToolsContent?: Record<string, string>; // Maps tool name to HTML content
  color?: string; // Hex or Tailwind color name
  createdAt: number;
}

export interface SubjectOption {
  id: string;
  name: string;
  isTransversal?: boolean;
}

export interface AiResponse {
  competencies: { code: string; text: string }[];
  criteria: { code: string; text: string }[];
  sabers: { code: string; text: string }[];
}

export interface RelationshipMapItem {
  criteriaCode: string;
  criteriaText: string;
  relatedSabers: string[]; // Codes of the sabers
  justification: string;
}
