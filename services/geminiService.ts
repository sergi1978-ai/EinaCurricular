
import { GoogleGenAI } from "@google/genai";
import { AiResponse, CurriculumItem, Session } from "../types";

/**
 * Neteja la resposta de la IA per assegurar que és un JSON vàlid, 
 * eliminant possibles blocs de codi markdown o text prefixat.
 */
const cleanJsonString = (str: string): string => {
  let cleaned = str.trim();
  // Busca el primer '{' o '[' i l'últim '}' o ']'
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');

  const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
  const end = (lastBrace !== -1 && (lastBracket === -1 || lastBrace > lastBracket)) ? lastBrace : lastBracket;

  if (start !== -1 && end !== -1) {
    return cleaned.substring(start, end + 1);
  }
  
  return cleaned;
};

/**
 * Funció auxiliar per esperar un temps determinat (exponential backoff)
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper principal per comunicar-se amb l'API de Gemini
 */
// Fix: Added explicit return type Promise<string> to callGemini
async function callGemini(prompt: string, model: string, isJson: boolean = false, retryCount = 0): Promise<string> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_REQUIRED");
  }

  const MAX_RETRIES = 2;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: isJson ? { 
        responseMimeType: "application/json",
      } : undefined
    });

    const text = response.text;
    if (!text) throw new Error("L'IA ha retornat una resposta buida.");
    
    return isJson ? cleanJsonString(text) : text;
  } catch (error: any) {
    console.error(`Error a l'intent ${retryCount + 1}:`, error.message);
    
    // Gestió de quota (429) - Espera i reintenta
    if (error.message?.includes("429") && retryCount < MAX_RETRIES) {
      const waitTime = Math.pow(2, retryCount) * 3000 + Math.random() * 1000;
      await sleep(waitTime);
      return callGemini(prompt, model, isJson, retryCount + 1);
    }

    throw error;
  }
}

export const getTitleOptions = async (subjects: string[], grade: string, keywords: string, model: string): Promise<{title: string, style: string}[]> => {
  // Fix: Used double quotes for the fallback string inside the template expression to avoid escaping issues with single quotes like "d'actualitat"
  const prompt = `Ets un expert en el currículum català (Decret 175/2022). 
  Genera exactament 6 títols suggeridors i creatius per a una Situació d'Aprenentatge de ${grade} de Primària. 
  Àrees: ${subjects.join(', ')}. 
  Context/Idees: ${keywords || "temes d'actualitat i reptes competencials"}.
  
  Respon EXCLUSIVAMENT en format JSON vàlid: 
  {"options": [{"title": "Títol Creatiu", "style": "Estil (Ex: Repte, Gamificació, Projecte de Recerca)"}]}`;

  const jsonStr = await callGemini(prompt, model, true);
  const data = JSON.parse(jsonStr);
  return data.options || [];
};

export const getDescriptionForTitle = async (title: string, subjects: string[], grade: string, model: string): Promise<string> => {
  const prompt = `Redacta una descripció pedagògica estructurada per a la Situació d'Aprenentatge "${title}" de ${grade} de Primària. 
  Àrees implicades: ${subjects.join(', ')}. 
  La descripció ha de tenir uns 3 paràgrafs i incloure:
  1. Justificació pedagògica.
  2. El repte o pregunta motriu (motiu del projecte).
  3. El producte final que l'alumnat ha de realitzar.
  Fes servir un llenguatge professional basat en el Decret 175/2022.`;
  
  return await callGemini(prompt, model);
};

export const generateDetailedActivities = async (title: string, description: string, grade: string, subjects: string[], numSessions: number, model: string): Promise<Session[]> => {
  const prompt = `Dissenya una seqüència didàctica DUA de ${numSessions} sessions per a la SA: "${title}" (${grade}). 
  Context: "${description}". 
  Àrees: ${subjects.join(', ')}.
  
  Per a cada sessió, el camp 'steps' ha de ser molt detallat (mínim 150 paraules per sessió) explicant la narrativa de l'aula.
  
  Respon EXCLUSIVAMENT amb JSON: 
  {"sessions": [{"title": "Nom sessió", "objective": "Objectiu", "steps": "Desenvolupament detallat", "dua": "Mesures inclusives", "methodology": "Estratègia", "evaluation": "Evidència"}]}`;

  const jsonStr = await callGemini(prompt, model, true);
  const data = JSON.parse(jsonStr);
  return data.sessions || [];
};

export const getCurriculumSuggestions = async (subjects: string[], grade: string, activityDescription: string, model: string): Promise<AiResponse> => {
  const prompt = `Basat en el Decret 175/2022 de Catalunya, selecciona Competències Específiques, Criteris d'Avaluació i Sabers Bàsics per a aquesta activitat: "${activityDescription}". 
  Nivell: ${grade}. Àrees: ${subjects.join(', ')}.
  
  Respon EXCLUSIVAMENT amb JSON: 
  {"competencies": [{"code": "CE1", "text": "..."}], "criteria": [{"code": "Crit. 1.1", "text": "..."}], "sabers": [{"code": "Saber 1", "text": "..."}]}`;

  const jsonStr = await callGemini(prompt, model, true);
  return JSON.parse(jsonStr);
};

export const suggestEvaluationTools = async (title: string, grade: string, criteria: CurriculumItem[], model: string): Promise<string[]> => {
  const prompt = `Proposa 5 instruments d'avaluació (ex: Rúbrica, Diana, Portfolio, Formulari...) per a la SA "${title}" tenint en compte aquests criteris: ${criteria.map(c => c.code).join(', ')}.
  Respon EXCLUSIVAMENT amb JSON: {"tools": ["Instrument 1", "Instrument 2", ...]}`;

  const jsonStr = await callGemini(prompt, model, true);
  const data = JSON.parse(jsonStr);
  return data.tools || ["Rúbrica", "Diaris d'aprenentatge"];
};

export const generateEvaluationToolContent = async (toolName: string, activityTitle: string, grade: string, criteria: CurriculumItem[], model: string): Promise<string> => {
  const prompt = `Crea el contingut de l'instrument d'avaluació "${toolName}" per a la SA "${activityTitle}" (${grade}). 
  Ha d'avaluar aquests criteris: ${criteria.map(c => c.code + ': ' + c.text).join('; ')}.
  Genera el contingut en format HTML net (sense <html> ni <body>, només el contingut). Si és una rúbrica, fes servir una <table> de Tailwind CSS.`;
  
  return await callGemini(prompt, model);
};
