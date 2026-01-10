import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, ComparisonResponse, DynamicParameter, DecisionCategory } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Robustly extracts JSON from a model response.
 * Handles markdown code blocks, extraneous text, and common formatting issues.
 */
function extractJSON(text: string): any {
  if (!text) return {};
  
  let cleaned = text.trim();
  
  // 1. Handle Markdown Code Blocks (```json ... ```)
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    cleaned = jsonMatch[1].trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // 2. Fallback: Find the first '{' or '[' and the last matching '}' or ']'
    const startObj = cleaned.indexOf('{');
    const endObj = cleaned.lastIndexOf('}');
    const startArr = cleaned.indexOf('[');
    const endArr = cleaned.lastIndexOf(']');

    let jsonContent = '';
    if (startObj !== -1 && endObj !== -1 && (startArr === -1 || startObj < startArr)) {
      jsonContent = cleaned.substring(startObj, endObj + 1);
    } else if (startArr !== -1 && endArr !== -1) {
      jsonContent = cleaned.substring(startArr, endArr + 1);
    }

    if (!jsonContent) {
      console.error("Failed to find JSON structure in text:", text);
      throw new Error("Invalid response format from AI");
    }

    try {
      return JSON.parse(jsonContent);
    } catch (innerError) {
      console.error("Inner JSON parse error at content:", jsonContent);
      throw innerError;
    }
  }
}

// Schema for generating the dynamic form inputs
const parameterGenerationSchema = {
  type: Type.OBJECT,
  properties: {
    parameters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          label: { type: Type.STRING },
          type: { 
            type: Type.STRING,
            description: "Must be: 'slider', 'toggle', 'select', or 'text'" 
          },
          min: { type: Type.NUMBER },
          max: { type: Type.NUMBER },
          unit: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          reason: { type: Type.STRING },
          defaultValue: { type: Type.STRING },
        },
        required: ['id', 'name', 'label', 'type', 'reason'],
      },
    },
    suggestedPriorities: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    }
  },
  required: ['parameters', 'suggestedPriorities'],
};

// Comparison schema 
const comparisonSchema = {
  type: Type.OBJECT,
  properties: {
    options: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          overview: { type: Type.STRING },
          pros: { type: Type.ARRAY, items: { type: Type.STRING } },
          cons: { type: Type.ARRAY, items: { type: Type.STRING } },
          best_for: { type: Type.STRING },
          risks: { type: Type.ARRAY, items: { type: Type.STRING } },
          cost_level: { 
            type: Type.STRING,
            description: "Enum: 'Low', 'Medium', 'High'" 
          },
          complexity: { 
            type: Type.STRING,
            description: "Enum: 'Low', 'Medium', 'High'" 
          },
          scores: {
            type: Type.OBJECT,
            properties: {
              suitability: { type: Type.INTEGER },
              risk: { type: Type.INTEGER },
              cost: { type: Type.INTEGER },
              scalability: { type: Type.INTEGER },
            },
            required: ["suitability", "risk", "cost", "scalability"],
          },
        },
        required: ["name", "overview", "pros", "cons", "best_for", "risks", "cost_level", "complexity", "scores"],
      },
    },
    summary: { type: Type.STRING },
    recommendation: { type: Type.STRING },
  },
  required: ["options", "summary", "recommendation"],
};

export async function getDynamicParameters(category: DecisionCategory, problemStatement: string) {
  const prompt = `
    Analyze this decision intent:
    Category: ${category}
    Problem: "${problemStatement}"
    
    Generate 4-6 relevant parameters (id, name, label, type, reason) and 4 key priorities.
    Available types: 'slider', 'toggle', 'select'.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: parameterGenerationSchema,
      systemInstruction: "You are The Referee. Provide strictly valid JSON following the schema. Do not include markdown or preamble.",
    },
  });

  const data = extractJSON(response.text);
  
  return {
    parameters: (data.parameters || []).map((p: any) => ({
      ...p,
      value: p.type === 'slider' ? ((p.min || 0) + (p.max || 100)) / 2 : p.type === 'toggle' ? false : p.defaultValue || ''
    })) as DynamicParameter[],
    suggestedPriorities: (data.suggestedPriorities || []) as string[]
  };
}

export async function compareOptions(prefs: UserPreferences): Promise<ComparisonResponse> {
  const paramSummary = prefs.dynamicParams
    .map(p => `- ${p.label}: ${p.value} ${p.unit || ''}`)
    .join("\n");

  const prompt = `
    Dilemma Category: "${prefs.category}"
    Problem: "${prefs.problemStatement}"
    Constraints:
    ${paramSummary}
    Priorities: ${prefs.priorities.join(", ")}

    Analyze and identify 2-3 distinct, viable options. Return comparison JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: comparisonSchema,
        maxOutputTokens: 4000,
        thinkingConfig: { thinkingBudget: 1000 },
        systemInstruction: "You are a neutral decision referee. Use the specific parameters provided to score options. Return ONLY valid JSON adhering to the schema. Ensure all arrays and objects are correctly closed.",
      },
    });

    return extractJSON(response.text) as ComparisonResponse;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}