
import { GoogleGenAI } from "@google/genai";
import { AiResponse, CurriculumItem, Session } from "../types";

/**
 * Models d'última generació segons l'especificació (Gemini 3)
 * Flash per a tasques ràpides, Pro per a raonament pedagògic complex.
 */
const SIMPLE_MODEL = 'gemini-3-flash-preview';
const COMPLEX_MODEL = 'gemini-3-pro-preview';

/**
 * Neteja la resposta de la IA per assegurar que és un JSON vàlid.
 * Elimina blocs de codi markdown i caràcters invisibles.
 */
const cleanJsonString = (str: string): string => {
  let cleaned = str.trim();
  if (cleaned.includes("```")) {
    cleaned = cleaned.replace(/```json/g, "").replace(/```/g, "").trim();
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
async function callGemini(prompt: string, model: string, isJson: boolean = false, retryCount = 0) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_REQUIRED");
  }

  const MAX_RETRIES = 3;

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
    if (!text) throw new Error("EMPTY_RESPONSE");
    
    return isJson ? cleanJsonString(text) : text;
  } catch (error: any) {
    console.error(`Error a l'intent ${retryCount + 1}:`, error.message);
    
    // Gestió de quota (429)
    if (error.message?.includes("429") && retryCount < MAX_RETRIES) {
      const waitTime = Math.pow(2, retryCount) * 2000 + Math.random() * 1000;
      await sleep(waitTime);
      return callGemini(prompt, model, isJson, retryCount + 1);
    }

    // Gestió de model no trobat (404) - reintentem amb el model de reserva
    if (error.message?.includes("404") && model !== 'gemini-flash-latest') {
      return callGemini(prompt, 'gemini-flash-latest', isJson, retryCount);
    }

    throw error;
  }
}

export const getTitleOptions = async (subjects: string[], grade: string, keywords: string): Promise<{title: string, style: string}[]> => {
  const prompt = `Ets un expert en el currículum català. Genera 6 títols suggeridors per a una Situació d'Aprenentatge de ${grade} de Primària. 
  Àrees: ${subjects.join(', ')}. Idees: ${keywords || 'temes actuals'}.
  Respon EXCLUSIVAMENT en format JSON: {"options": [{"title": "Títol", "style": "Estil (Ex: Repte, Gamificació, Recerca)"}]}`;

  try {
    const jsonStr = await callGemini(prompt, SIMPLE_MODEL, true);
    const data = JSON.parse(jsonStr);
    return data.options || [];
  } catch (e) {
    console.error("Error generant títols:", e);
    return [];
  }
};

export const getDescriptionForTitle = async (title: string, subjects: string[], grade: string): Promise<string> => {
  const prompt = `Redacta una descripció pedagògica detallada (aprox. 20 línies) per a la SA "${title}" de ${grade}. Àrees: ${subjects.join(', ')}. 
  Ha d'incloure justificació, repte i producte final segons el Decret 175/2022.`;
  return await callGemini(prompt, SIMPLE_MODEL);
};

export const generateDetailedActivities = async (title: string, description: string, grade: string, subjects: string[], numSessions: number): Promise<Session[]> => {
  const prompt = `Dissenya una seqüència DUA de ${numSessions} sessions per a la SA: "${title}" (${grade}). 
  Descripció: "${description}". Àrees: ${subjects.join(', ')}.
  Cada sessió ha de tenir el camp 'steps' amb una descripció molt àmplia i narrativa (mínim 300 paraules).
  Respon EXCLUSIVAMENT amb JSON: {"sessions": [{"title": "...", "objective": "...", "steps": "...", "dua": "...", "methodology": "...", "evaluation": "..."}]}`;

  try {
    const jsonStr = await callGemini(prompt, COMPLEX_MODEL, true);
    const data = JSON.parse(jsonStr);
    return data.sessions || [];
  } catch (e) {
    throw e;
  }
};

export const getCurriculumSuggestions = async (subjects: string[], grade: string, activityDescription: string): Promise<AiResponse> => {
  const prompt = `Proposa elements curriculars (CE, Criteris, Sabers) per a: "${activityDescription}". Nivell: ${grade}. Àrees: ${subjects.join(', ')}.
  Respon EXCLUSIVAMENT amb JSON: {"competencies": [{"code": "...", "text": "..."}], "criteria": [{"code": "...", "text": "..."}], "sabers": [{"code": "...", "text": "..."}]}`;

  try {
    const jsonStr = await callGemini(prompt, COMPLEX_MODEL, true);
    return JSON.parse(jsonStr);
  } catch (e) {
    throw e;
  }
};

export const suggestEvaluationTools = async (title: string, grade: string, criteria: CurriculumItem[]): Promise<string[]> => {
  const prompt = `Proposa 5 instruments d'avaluació per a "${title}" segons els criteris: ${criteria.map(c => c.code).join(', ')}.
  Respon amb JSON: {"tools": ["..."]}`;

  try {
    const jsonStr = await callGemini(prompt, SIMPLE_MODEL, true);
    const data = JSON.parse(jsonStr);
    return data.tools || [];
  } catch (e) {
    return ["Rúbrica", "Diaris d'aprenentatge"];
  }
};

export const generateEvaluationToolContent = async (toolName: string, activityTitle: string, grade: string, criteria: CurriculumItem[]): Promise<string> => {
  const prompt = `Crea l'instrument "${toolName}" (format HTML, <table> si és rúbrica) per a la SA "${activityTitle}" (${grade}). 
  Basat en: ${criteria.map(c => c.code + ': ' + c.text).join('; ')}.`;
  return await callGemini(prompt, COMPLEX_MODEL);
}
