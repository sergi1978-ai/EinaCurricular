
import { GoogleGenAI } from "@google/genai";
import { AiResponse, CurriculumItem, Session } from "../types";

/**
 * Models corregits segons l'especificació oficial per evitar l'error 404
 */
const SIMPLE_MODEL = 'gemini-flash-lite-latest';
const COMPLEX_MODEL = 'gemini-3-flash-preview';

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
 * Helper per fer crides a Gemini amb gestió de reintents millorada
 */
async function callGemini(prompt: string, model: string, isJson: boolean = false, retryCount = 0) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_REQUIRED");
  }

  const MAX_RETRIES = 4;

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
    
    // Si l'error és de quota (429)
    if (error.message?.includes("429") && retryCount < MAX_RETRIES) {
      const jitter = Math.random() * 500;
      const waitTime = (Math.pow(2, retryCount) * 1500) + jitter; 
      
      console.warn(`Límit assolit. Reintentant en ${(waitTime/1000).toFixed(1)}s...`);
      await sleep(waitTime);
      return callGemini(prompt, model, isJson, retryCount + 1);
    }

    // Si el model no es troba (404), ho intentem amb un model de seguretat (flash)
    if (error.message?.includes("404") && model !== COMPLEX_MODEL) {
      console.warn(`Model ${model} no trobat. Provant amb ${COMPLEX_MODEL}...`);
      return callGemini(prompt, COMPLEX_MODEL, isJson, retryCount);
    }

    if (error.message?.includes("429")) throw new Error("RATE_LIMIT_EXCEEDED");
    throw error;
  }
}

export const getTitleOptions = async (subjects: string[], grade: string, keywords: string): Promise<{title: string, style: string}[]> => {
  const prompt = `Ets un expert en el currículum català. Genera 6 títols creatius per a una Situació d'Aprenentatge de ${grade} de Primària. 
  Àrees: ${subjects.join(', ')}. Idees: ${keywords || 'interès general'}.
  Respon EXCLUSIVAMENT amb JSON: {"options": [{"title": "...", "style": "..."}]}`;

  try {
    const jsonStr = await callGemini(prompt, SIMPLE_MODEL, true);
    const data = JSON.parse(jsonStr);
    return data.options || [];
  } catch (e) {
    return [];
  }
};

export const getDescriptionForTitle = async (title: string, subjects: string[], grade: string): Promise<string> => {
  const prompt = `Escriu una descripció professional (10 línies) per a la SA "${title}" (${grade}). Àrees: ${subjects.join(', ')}. Contextualitza el repte i el producte final.`;
  return await callGemini(prompt, SIMPLE_MODEL);
};

export const generateDetailedActivities = async (title: string, description: string, grade: string, subjects: string[], numSessions: number): Promise<Session[]> => {
  const prompt = `Dissenya una seqüència DUA de ${numSessions} sessions per a la SA: "${title}" de ${grade}. 
  Context: "${description}". Àrees: ${subjects.join(', ')}.
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
  const prompt = `Proposa elements del Decret 175/2022 per a aquesta SA: "${activityDescription}". Nivell: ${grade}. Àrees: ${subjects.join(', ')}.
  Respon EXCLUSIVAMENT amb JSON: {"competencies": [{"code": "...", "text": "..."}], "criteria": [{"code": "...", "text": "..."}], "sabers": [{"code": "...", "text": "..."}]}`;

  try {
    const jsonStr = await callGemini(prompt, COMPLEX_MODEL, true);
    return JSON.parse(jsonStr);
  } catch (e) {
    throw e;
  }
};

export const suggestEvaluationTools = async (title: string, grade: string, criteria: CurriculumItem[]): Promise<string[]> => {
  const prompt = `Proposa 5 instruments d'avaluació per a la SA "${title}" (${grade}) segons aquests criteris: ${criteria.map(c => c.code).join(', ')}.
  Respon EXCLUSIVAMENT amb JSON: {"tools": ["..."]}`;

  try {
    const jsonStr = await callGemini(prompt, COMPLEX_MODEL, true);
    const data = JSON.parse(jsonStr);
    return data.tools || [];
  } catch (e) {
    return ["Rúbrica", "Diaris d'aprenentatge"];
  }
};

export const generateEvaluationToolContent = async (toolName: string, activityTitle: string, grade: string, criteria: CurriculumItem[]): Promise<string> => {
  const prompt = `Crea l'instrument "${toolName}" (format HTML, <table> si és rúbrica) per a la SA "${activityTitle}" (${grade}). 
  Criteris base: ${criteria.map(c => c.code + ': ' + c.text).join('; ')}.`;
  return await callGemini(prompt, COMPLEX_MODEL);
}
