
import { GoogleGenAI } from "@google/genai";
import { AiResponse, CurriculumItem, Session } from "../types";

/**
 * Models recomanats segons la tasca
 */
const FLASH_MODEL = 'gemini-3-flash-preview';
const PRO_MODEL = 'gemini-3-pro-preview';

/**
 * Neteja la resposta de la IA per assegurar que és un JSON vàlid
 */
const cleanJsonString = (str: string): string => {
  return str.replace(/```json/g, "").replace(/```/g, "").trim();
};

/**
 * Helper per fer crides a Gemini
 */
async function callGemini(prompt: string, model: string, isJson: boolean = false) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_REQUIRED");
  }

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
    console.error("Gemini API Error:", error);
    if (error.message?.includes("429")) throw new Error("RATE_LIMIT_EXCEEDED");
    if (error.message?.includes("API key not valid")) throw new Error("INVALID_API_KEY");
    throw error;
  }
}

export const getTitleOptions = async (subjects: string[], grade: string, keywords: string): Promise<{title: string, style: string}[]> => {
  const prompt = `Ets un expert en el currículum català (Decret 175/2022). Genera 6 títols per a una SA de ${grade} de Primària. 
  Àrees: ${subjects.join(', ')}. Paraules clau: ${keywords}.
  Respon EXCLUSIVAMENT amb un JSON vàlid: {"options": [{"title": "...", "style": "..."}]}`;

  try {
    const jsonStr = await callGemini(prompt, FLASH_MODEL, true);
    const data = JSON.parse(jsonStr);
    return data.options || [];
  } catch (e) {
    console.error("Error getting titles:", e);
    return [];
  }
};

export const getDescriptionForTitle = async (title: string, subjects: string[], grade: string): Promise<string> => {
  const prompt = `Ets un expert en pedagogia i currículum català. Escriu una descripció motivadora d'unes 10 línies per a la SA "${title}" per a ${grade}. Àrees: ${subjects.join(', ')}. Contextualitza el repte i el producte final.`;
  return await callGemini(prompt, FLASH_MODEL);
};

export const generateDetailedActivities = async (title: string, description: string, grade: string, subjects: string[], numSessions: number): Promise<Session[]> => {
  const prompt = `Ets un expert en disseny de Situacions d'Aprenentatge (DUA) per a ${grade} de Primària.
  Genera una seqüència detallada de ${numSessions} sessions per a: "${title}". 
  Descripció: "${description}". Àrees: ${subjects.join(', ')}.
  Cada sessió ha d'incloure: title, objective, steps (molt detallat), dua (mesures universals), methodology i evaluation.
  Respon EXCLUSIVAMENT amb JSON: {"sessions": [{"title": "...", "objective": "...", "steps": "...", "dua": "...", "methodology": "...", "evaluation": "..."}]}`;

  try {
    const jsonStr = await callGemini(prompt, PRO_MODEL, true);
    const data = JSON.parse(jsonStr);
    return data.sessions || [];
  } catch (e) {
    console.error("Error generating sequence:", e);
    throw e;
  }
};

export const getCurriculumSuggestions = async (subjects: string[], grade: string, activityDescription: string): Promise<AiResponse> => {
  const prompt = `Analitza aquesta SA de ${grade} de Primària i proposa elements del Decret 175/2022 (Catalunya).
  SA: "${activityDescription}". Àrees: ${subjects.join(', ')}.
  Proposa competències específiques, criteris d'avaluació i sabers bàsics concrets.
  Respon EXCLUSIVAMENT amb JSON: {"competencies": [{"code": "...", "text": "..."}], "criteria": [{"code": "...", "text": "..."}], "sabers": [{"code": "...", "text": "..."}]}`;

  try {
    const jsonStr = await callGemini(prompt, PRO_MODEL, true);
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Error getting curriculum:", e);
    throw e;
  }
};

export const suggestEvaluationTools = async (title: string, grade: string, criteria: CurriculumItem[]): Promise<string[]> => {
  const prompt = `Proposa 5 instruments d'avaluació per a la SA "${title}" de ${grade}, basats en: ${criteria.map(c => c.code).join(', ')}.
  Respon EXCLUSIVAMENT amb JSON: {"tools": ["..."]}`;

  try {
    const jsonStr = await callGemini(prompt, PRO_MODEL, true);
    const data = JSON.parse(jsonStr);
    return data.tools || [];
  } catch (e) {
    return ["Rúbrica d'avaluació", "Llista de control"];
  }
};

export const generateEvaluationToolContent = async (toolName: string, activityTitle: string, grade: string, criteria: CurriculumItem[]): Promise<string> => {
  const prompt = `Crea el contingut professional (HTML net, <table> si és rúbrica) de l'instrument "${toolName}" per a la SA "${activityTitle}" (${grade}). 
  Base: ${criteria.map(c => c.code + ': ' + c.text).join('; ')}.`;
  return await callGemini(prompt, PRO_MODEL);
}
