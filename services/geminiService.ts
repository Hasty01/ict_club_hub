
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ActivityIdea {
  title: string;
  description: string;
  location: string;
}

export const generateClubActivityIdea = async (): Promise<ActivityIdea> => {
  const model = "gemini-2.5-flash";
  const prompt = `
    You are an enthusiastic and creative patron for a high school ICT Club. 
    Generate ONE detailed and exciting activity idea for the club.
    It should be feasible for a school setting, educational, and engaging.
    Topics can include coding, hardware, robotics, design, career talks, or tech trivia.
    
    Return a JSON object with:
    - title: A catchy name for the event.
    - description: A short, persuasive description of what will happen (2-3 sentences).
    - location: A suggested typical school location (e.g., "Computer Lab", "School Hall", "Maker Space", "Online").
  `;

  try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              location: { type: Type.STRING },
            },
            required: ["title", "description", "location"],
          },
        },
      });

      let text = response.text;
      if (!text) {
        throw new Error("No response from AI");
      }

      // Cleanup: Remove markdown code blocks if present (e.g. ```json ... ```)
      if (text.startsWith('```')) {
          text = text.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
      }

      return JSON.parse(text) as ActivityIdea;
  } catch (error) {
      console.error("Gemini API Error:", error);
      throw new Error("Failed to generate activity idea. Please check your API key.");
  }
};

export const getAIChatResponse = async (history: { role: 'user' | 'model', parts: [{ text: string }] }[], message: string) => {
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: "You are the helpful AI Assistant for the ICT Club. You help members with coding questions, project ideas, and club logistics. Be concise, encouraging, and tech-savvy."
        },
        history: history
    });

    const response = await chat.sendMessage({ message });
    return response.text;
};
