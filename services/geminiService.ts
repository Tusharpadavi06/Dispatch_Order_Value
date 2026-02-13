
import { GoogleGenAI, Type } from "@google/genai";
import { SubmissionPayload } from "../types";

const getApiKey = () => {
  try {
    return (typeof process !== 'undefined' && process.env?.API_KEY) ? process.env.API_KEY : '';
  } catch {
    return '';
  }
};

export const analyzeHistoryTrends = async (history: SubmissionPayload[]): Promise<any> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  
  const dataSummary = history.map(h => ({
    date: h.date,
    totalOrder: h.totalOrder,
    totalDispatch: h.totalDispatch,
    efficiency: h.totalOrder > 0 ? (h.totalDispatch / h.totalOrder * 100).toFixed(1) : 0
  }));

  const prompt = `Analyze the historical business data for Ginza Industries Limited:
  Data: ${JSON.stringify(dataSummary)}
  
  Provide a high-level executive summary, identify 3 specific growth or efficiency trends, and give an overall performance status (excellent, normal, or warning). Response must be in JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            insights: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            status: { type: Type.STRING }
          },
          required: ["summary", "insights", "status"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Trend Audit Error:", error);
    return null;
  }
};
