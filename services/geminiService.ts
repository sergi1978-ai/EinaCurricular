
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
 * Funció auxiliar per esperar un temps determinat
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper per fer crides a Gemini amb gestió de reintents per quota
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
    console.error(`Gemini API Error (Intent ${retryCount + 1}):`, error);
    
    // Si l'error és de quota (429) i no hem superat els reintents
    if (error.message?.includes("429") && retryCount < MAX_RETRIES) {
      const waitTime = Math.pow(2, retryCount) * 1000; // Espera exponencial: 1s, 2s, 4s
      console.warn(`Límit de quota assolit. Reintentant en ${waitTime}ms...`);
      await sleep(waitTime);
      return callGemini(prompt, model, isJson, retryCount + 1);
    }

    if (error.message?.includes("429")) throw new Error("RATE_LIMIT_EXCEEDED");
    if (error.message?.includes("API key not valid")) throw new Error("INVALID_API_KEY");
    throw error;
  }
}

export const getTitleOptions = async (subjects: string[], grade: string, keywords: string): Promise<{title: string, style: string}[]> => {
  const prompt = `Ets un expert en el currículum català (Decret 175/2022). Genera 6 títols suggeridors i creatius per a una Situació d'Aprenentatge de ${grade} de Primària. 
  Àrees implicades: ${subjects.join(', ')}. 
  Paraules clau o idees: ${keywords || 'temes d\'actualitat i interès per l\'alumnat'}.
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
  const prompt = `Ets un expert en pedagogia i currículum català. Escriu una descripció motivadora i professional d'unes 10 línies per a la Situació d'Aprenentatge titulada "${title}" per a ${grade} de Primària. 
  Àrees: ${subjects.join(', ')}. 
  La descripció ha de plantejar un repte o pregunta inicial, el context d'aprenentatge i el producte final esperat. Utilitza un to engrescador per al docent.`;
  return await callGemini(prompt, FLASH_MODEL);
};

export const generateDetailedActivities = async (title: string, description: string, grade: string, subjects: string[], numSessions: number): Promise<Session[]> => {
  const prompt = `Ets un expert en disseny de Situacions d'Aprenentatge seguint el marc DUA (Disseny Universal per a l'Aprenentatge) per a ${grade} de Primària a Catalunya.
  Genera una seqüència detallada de ${numSessions} sessions per a la SA: "${title}". 
  Descripció del context: "${description}". 
  Àrees: ${subjects.join(', ')}.
  Cada sessió ha d'incloure: 
  - title (títol de la sessió)
  - objective (objectiu d'aprenentatge en infinitiu)
  - steps (explicació detallada pas a pas de la sessió)
  - dua (mesures universals per a la inclusió i pautes DUA aplicades)
  - methodology (tipus d'agrupament i mètode)
  - evaluation (com s'avaluarà durant la sessió)
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
  const prompt = `Analitza aquesta Situació d'Aprenentatge de ${grade} de Primària i proposa els elements del Decret 175/2022 (Catalunya) que millor hi encaixin.
  Context de la SA: "${activityDescription}". 
  Àrees: ${subjects.join(', ')}.
  Proposa:
  1. Competències específiques de cada àrea.
  2. Criteris d'avaluació vinculats.
  3. Sabers bàsics concrets.
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
  const prompt = `Proposa 5 instruments d'avaluació diversos (rúbriques, diaris, llistes, productes...) per a la SA "${title}" de ${grade}, tenint en compte aquests criteris d'avaluació: ${criteria.map(c => c.code).join(', ')}.
  Respon EXCLUSIVAMENT amb JSON: {"tools": ["..."]}`;

  try {
    const jsonStr = await callGemini(prompt, PRO_MODEL, true);
    const data = JSON.parse(jsonStr);
    return data.tools || [];
  } catch (e) {
    return ["Rúbrica d'avaluació", "Llista de control", "Diaris d'aprenentatge"];
  }
};

export const generateEvaluationToolContent = async (toolName: string, activityTitle: string, grade: string, criteria: CurriculumItem[]): Promise<string> => {
  const prompt = `Ets un expert en avaluació formativa. Crea el contingut professional (en format HTML net, utilitzant <table> si l'instrument és una rúbrica) per a l'instrument "${toolName}" de la SA "${activityTitle}" (${grade}). 
  L'instrument ha de permetre avaluar aquests criteris: ${criteria.map(c => c.code + ': ' + c.text).join('; ')}. 
  Assegura't que els indicadors siguin clars i graduats.`;
  return await callGemini(prompt, PRO_MODEL);
}
