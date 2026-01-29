
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
  const prompt = `Ets un expert en el currículum català (Decret 175/2022). Genera 6 títols suggeridors i creatius per a una Situació d'Aprenentatge de ${grade} de Primària. 
  Àrees implicades: ${subjects.join(', ')}. 
  Paraules clau o idees: ${keywords || 'temes d\'actualitat i interès per l\'alumnat'}.
  Respon EXCLUSIVAMENT amb un JSON vàlid: {"options": [{"title": "...", "style": "..."}]}`;

  try {
    const jsonStr = await callGemini(prompt, SIMPLE_MODEL, true);
    const data = JSON.parse(jsonStr);
    return data.options || [];
  } catch (e) {
    return [];
  }
};

export const getDescriptionForTitle = async (title: string, subjects: string[], grade: string): Promise<string> => {
  const prompt = `Ets un expert en pedagogia i currículum català. Escriu una descripció EXHAUSTIVA d'unes 25 línies per a la Situació d'Aprenentatge titulada "${title}" per a ${grade} de Primària. 
  Àrees: ${subjects.join(', ')}. 
  La descripció ha d'incloure:
  1. Justificació pedagògica: Per què és rellevant aquest aprenentatge?
  2. Contextualització: En quin entorn o repte real se situa l'alumnat?
  3. Producte final: Què s'espera que creïn o facin al final del procés?
  4. Impacte: Quina transformació o aprenentatge profund es busca?
  Utilitza un to molt professional, engrescador i utilitza un vocabulari d'acord amb el Decret 175/2022.`;
  return await callGemini(prompt, SIMPLE_MODEL);
};

export const generateDetailedActivities = async (title: string, description: string, grade: string, subjects: string[], numSessions: number): Promise<Session[]> => {
  const prompt = `Ets un expert en disseny de Situacions d'Aprenentatge DUA (Disseny Universal per a l'Aprenentatge). 
  Dissenya una seqüència didàctica ALTAMENT DETALLADA de ${numSessions} sessions per a la SA: "${title}" (${grade}). 
  Descripció base: "${description}". 
  Àrees implicades: ${subjects.join(', ')}.

  Per a cada sessió, el camp 'steps' ha de ser una descripció narrativa i exhaustiva (mínim 300 paraules) que detalli:
  - Fase d'activació o motivació.
  - Desenvolupament de les activitats principals pas a pas (gestió d'aula, preguntes clau).
  - Gestió de l'avaluació formativa durant la sessió.
  - Fase de tancament i reflexió.

  Respon EXCLUSIVAMENT amb JSON: 
  {"sessions": [
    {
      "title": "Títol de la sessió",
      "objective": "Objectiu d'aprenentatge detallat",
      "steps": "Desenvolupament narratiu, llarg i minuciós de la sessió...",
      "dua": "Pautes DUA aplicades específicament a aquesta sessió",
      "methodology": "Organització de l'espai i agrupaments",
      "evaluation": "Criteris i evidències de la sessió"
    }
  ]}`;

  try {
    const jsonStr = await callGemini(prompt, COMPLEX_MODEL, true);
    const data = JSON.parse(jsonStr);
    return data.sessions || [];
  } catch (e) {
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
  const prompt = `Crea l'instrument d'avaluació "${toolName}" (format HTML, utilitza <table> amb columnes de gradació de 1 a 4 si és una rúbrica) per a la SA "${activityTitle}" de ${grade}. 
  L'instrument ha de ser molt detallat i basar-se en aquests criteris: ${criteria.map(c => c.code + ': ' + c.text).join('; ')}.`;
  return await callGemini(prompt, COMPLEX_MODEL);
}
