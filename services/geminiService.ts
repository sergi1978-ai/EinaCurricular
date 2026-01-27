
import { GoogleGenAI } from "@google/genai";
import { AiResponse, CurriculumItem, Session } from "../types";

/**
 * Model recomanat per a tasques de text: gemini-3-flash-preview.
 */
// Use gemini-3-flash-preview as the default recommended model for these text tasks.
const MODEL_NAME = 'gemini-3-flash-preview';

/**
 * Helper per fer crides a Gemini assegurant que tenim la clau actualitzada.
 */
async function callGemini(prompt: string, isJson: boolean = false) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_REQUIRED");
  }

  // Creem la instància just abans de la crida segons les guies de Gemini API
  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: isJson ? { 
      responseMimeType: "application/json",
      // Es recomana no posar maxOutputTokens si no és necessari per evitar talls
    } : undefined
  });

  // Accedim a la propietat .text directament (no és un mètode)
  return response.text;
}

export const getTitleOptions = async (subjects: string[], grade: string, keywords: string): Promise<{title: string, style: string}[]> => {
  const prompt = `Ets un expert en el currículum català (Decret 175/2022) i en pedagogia per a ${grade} de Primària. 
  Genera 6 títols creatius i engrescadors per a una Situació d'Aprenentatge centrada en l'alumnat.
  Àrees principals: ${subjects.join(', ')}. Paraules clau orientatives: ${keywords || "interessos de l'alumnat, aprenentatge actiu, descoberta"}.
  Els títols han de ser atractius per a l'edat i suggerir un repte o una investigació.
  Respon EXCLUSIVAMENT amb un JSON vàlid: 
  {"options": [{"title": "títol de la SA", "style": "Recerca | Repte | Narrativa | Projecte"}]}`;

  try {
    const text = await callGemini(prompt, true);
    const data = JSON.parse(text || '{"options":[]}');
    return data.options || [];
  } catch (e) {
    console.error("Gemini Titles Error:", e);
    throw e;
  }
};

export const getDescriptionForTitle = async (title: string, subjects: string[], grade: string): Promise<string> => {
  const prompt = `Ets un expert en pedagogia i currículum català (Decret 175/2022) per a ${grade} de Primària. 
  Escriu una descripció DETALLADA d'entre 8 i 10 línies per a la Situació d'Aprenentatge "${title}".
  Àrees implicades: ${subjects.join(', ')}.
  La descripció ha de contextualitzar la SA de manera motivadora per a l'alumnat, presentar clarament el repte o la pregunta inicial, i avançar el producte final o l'acció transformadora. 
  Utilitza un llenguatge atractiu i competencial.`;

  try {
    const text = await callGemini(prompt);
    return text || "Descripció no generada.";
  } catch (e) {
    throw e;
  }
};

export const generateDetailedActivities = async (title: string, description: string, grade: string, subjects: string[], numSessions: number): Promise<Session[]> => {
  const prompt = `Ets un expert en disseny de Situacions d'Aprenentatge competencials i en Disseny Universal de l'Aprenentatge (DUA) per a ${grade} de Primària.
  Genera una seqüència didàctica professional i ALTAMENT DETALLADA de ${numSessions} sessions per a la SA "${title}".
  Descripció general: "${description}".
  Àrees implicades: ${subjects.join(', ')}.
  
  Assegura que la seqüència didàctica segueixi els principis del cicle de l'aprenentatge. Per a cada sessió, el desenvolupament ha de progressar de la següent manera:
  1.  **Introducció/Motivació**: Activitat inicial que capti l'atenció de l'alumnat i connecti amb els seus coneixements previs o interessos.
  2.  **Desenvolupament/Exploració**: Fases on l'alumnat investiga, experimenta, construeix coneixement o practica habilitats de manera activa.
  3.  **Aplicació/Elaboració**: Tasques on l'alumnat aplica el que ha après en nous contextos o crea productes.
  4.  **Síntesi/Reflexió**: Activitats per consolidar l'aprenentatge, reflexionar sobre el procés o compartir conclusions.

  Per a cada sessió, inclou els següents elements amb molta precisió, pensant en un mestre que la implementarà:
  - **title**: Títol curt i descriptiu de la sessió.
  - **objective**: Objectiu d'aprenentatge concret en format competencial ("Que l'alumnat pugui...").
  - **steps**: Descripció minuciosa del desenvolupament de l'activitat, seguint el cicle d'aprenentatge esmentat. Aquí s'ha de detallar:
    - Organització de l'aula (individual, parelles, grups petits, gran grup).
    - Materials i recursos necessaris (específics).
    - Tasques concretes que ha de fer l'alumnat.
    - Rol del mestre.
    - Estratègies pedagògiques (gamificació, aprenentatge cooperatiu, indagació, debat, etc.).
    - Gestió del temps aproximada per a cada part.
    - Utilitza llistes amb guionets per a la claredat dels passos si és possible.
  - **dua**: Mesures concretes i pràctiques de Disseny Universal de l'Aprenentatge per garantir l'accessibilitat, el compromís i la representació per a tot l'alumnat. Inclou almenys 3 mesures específiques per a cada sessió, com ara:
    - Suports visuals, esquemes, organitzadors gràfics.
    - Opcions de resposta variades (escrita, oral, dibuix, digital).
    - Material manipulatiu.
    - Agrupaments flexibles.
    - Temps extra o suport individualitzat.
    - Ús de tecnologia.
    - Utilitza llistes amb guionets per a la claredat de les mesures.
  - **methodology**: Breu resum de la metodologia principal de la sessió.
  - **evaluation**: Breu indicació de com s'observarà l'aprenentatge.
  
  Respon EXCLUSIVAMENT amb un JSON vàlid amb un array de "sessions":
  {"sessions": [{"title": "...", "objective": "...", "steps": "...", "dua": "...", "methodology": "...", "evaluation": "..."}]}`;

  try {
    const text = await callGemini(prompt, true);
    const data = JSON.parse(text || '{"sessions":[]}');
    return data.sessions.map((s: any) => ({
      title: s.title || "Sessió sense títol",
      objective: s.objective || "Objectiu d'aprenentatge a definir",
      steps: s.steps || "Desenvolupament de l'activitat a detallar.",
      methodology: s.methodology || "Metodologia activa.",
      dua: s.dua || "Mesures universals per garantir l'accés a l'aprenentatge.",
      evaluation: s.evaluation || "Observació sistemàtica i feedback."
    }));
  } catch (e) {
    console.error("Gemini Detailed Activities Error:", e);
    throw e;
  }
};

export const getCurriculumSuggestions = async (subjects: string[], grade: string, activityDescription: string): Promise<AiResponse> => {
  const prompt = `Ets un expert en el Decret 175/2022 de Catalunya i en el currículum de ${grade} de Primària.
  Analitza la següent Situació d'Aprenentatge i proposa una llista MÉS ÀMPLIA I DETALLADA dels elements curriculars més ADIENTS, CONCRETS i ESPECÍFICS (competències, criteris d'avaluació i sabers bàsics) que s'hi vinculen directament. Evita elements genèrics si n'hi ha de més específics.
  SA: "${activityDescription}"
  Àrees implicades: ${subjects.join(', ')}. Nivell: ${grade}.
  Respon EXCLUSIVAMENT amb JSON:
  {"competencies": [{"code": "CE1", "text": "..."}], "criteria": [{"code": "1.1", "text": "..."}], "sabers": [{"code": "S1", "text": "..."}]}`;

  try {
    const text = await callGemini(prompt, true);
    return JSON.parse(text || '{"competencies":[], "criteria":[], "sabers":[]}');
  } catch (e) {
    console.error("Gemini Curriculum Suggestions Error:", e);
    throw e;
  }
};

export const suggestEvaluationTools = async (title: string, grade: string, criteria: CurriculumItem[]): Promise<string[]> => {
  const prompt = `Ets un expert en avaluació competencial per a ${grade} de Primària.
  Proposa 5 noms d'instruments d'avaluació diversos i ADAPTATS per a la Situació d'Aprenentatge "${title}", basats en els següents criteris d'avaluació: ${criteria.map(c => c.code + ': ' + c.text).join('; ')}.
  Inclou instruments com rúbriques, llistes de control, diaris de reflexió, escales d'observació, mapes conceptuals, etc.
  Respon EXCLUSIVAMENT amb un JSON vàlid: {"tools": ["Rúbrica de...", "Llista de control de...", "Diari de reflexió de...", ...]}`;

  try {
    const text = await callGemini(prompt, true);
    const data = JSON.parse(text || '{"tools":[]}');
    return data.tools;
  } catch (e) {
    console.error("Gemini Suggest Evaluation Tools Error:", e);
    throw e;
  }
};

export const generateEvaluationToolContent = async (toolName: string, activityTitle: string, grade: string, criteria: CurriculumItem[]): Promise<string> => {
  const prompt = `Ets un expert en avaluació competencial i pedagogia per a ${grade} de Primària.
  Crea el contingut tècnic i professional per a l'instrument d'avaluació "${toolName}" de la Situació d'Aprenentatge "${activityTitle}".
  Utilitza els següents criteris d'avaluació com a base: ${criteria.map(c => c.code + ': ' + c.text).join('; ')}.
  
  Format: Genera un HTML net i senzill, compatible per copiar i enganxar en editors de text com Google Docs o Word. No incloguis cap text introductori o justificació sobre per què s'ha escollit aquest instrument, només el contingut de l'instrument en si.
  - SI ÉS UNA RÚBRICA: Genera una taula HTML <table> completa amb 4 nivells de l'1 al 4 (Assoliment excel·lent, notable, satisfactori, no assolit). Defineix clarament els indicadors per a cada nivell i criteri. Adapta el llenguatge al nivell de Primària.
  - SI ÉS UNA LLISTA DE CONTROL: Genera una taula HTML with una columna per a l'element a observar i una per a "Sí/No" o "Assolit/No assolit", amb indicadors clars.
  - SI ÉS UN DIARI DE REFLEXIÓ: Proposa preguntes guiadores per a l'alumnat sobre el seu aprenentatge, dificultats, èxits i aplicació.
  - Altres instruments: Adapta el format al tipus d'instrument, sempre amb contingut pedagògicament sòlid i útil per al mestre.`;

  try {
    const text = await callGemini(prompt);
    return text || "Contingut no disponible.";
  } catch (e) {
    console.error("Gemini Generate Evaluation Tool Content Error:", e);
    throw e;
  }
};
