import { GoogleGenAI } from "@google/genai";

// Per SDK guidelines, the API key is expected to be available in process.env.API_KEY.
// The client is initialized here, and it's assumed the key is present.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateActivityIdeas = async (query: string): Promise<{ ideas: { idea: string, description: string }[], sources: any[] }> => {
  try {
    // FIX: Updated prompt to request structured text instead of JSON, as JSON output is not guaranteed with googleSearch grounding.
    const prompt = `Generate 5 fun and engaging activity ideas for an ICT club based on the topic: "${query}". Format the response as a list where each idea has a title and a one-sentence description, separated by "::". For example: "Activity Title::Activity Description". Each idea should be on a new line. Do not include any other text or formatting.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
      },
    });
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // FIX: The response text with grounding is not guaranteed to be JSON. Parse the structured text instead.
    const ideas = response.text.trim().split('\n').map(line => {
      const parts = line.split('::');
      if (parts.length === 2) {
        return { idea: parts[0].trim(), description: parts[1].trim() };
      }
      return null;
    }).filter((idea): idea is { idea: string, description: string } => idea !== null);

    return {
        ideas: ideas || [],
        // Ensure we only return web sources, as per grounding chunk structure
        sources: sources.filter(s => s.web), 
    };
  } catch (error) {
    console.error("Error generating activity ideas with search:", error);
    if (error instanceof SyntaxError) {
        throw new Error("Failed to generate ideas from AI. The response was not in the expected format.");
    }
    throw new Error("Failed to generate ideas from AI. Please try again.");
  }
};

export const generateAnnouncement = async (prompt: string): Promise<{ title: string, message: string }> => {
  try {
    const fullPrompt = `You are an AI assistant for a club patron. Your task is to generate a club announcement based on a simple prompt.
The announcement should have a concise, engaging title and a clear, informative message.
Format the response as a single line with the title and message separated by "::". For example: "Announcement Title::Announcement Message".
Do not include any other text or formatting.

User's prompt: "${prompt}"`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
    });
    
    const [title, message] = response.text.trim().split('::');

    if (!title || !message) {
        throw new SyntaxError("AI response was not in the expected 'Title::Message' format.");
    }

    return { title: title.trim(), message: message.trim() };
  } catch (error) {
    console.error("Error generating announcement:", error);
    if (error instanceof SyntaxError) {
        throw new Error("Failed to generate announcement from AI. The response was not in the expected format.");
    }
    throw new Error("Failed to generate announcement from AI. Please try again.");
  }
};


export const executeCode = async (code: string): Promise<string> => {
  try {
    const prompt = `
Please act as a Python code interpreter. Execute the following Python code and return ONLY the raw, standard output. 
Do not provide any explanations, annotations, or introductory text like "Here is the output:".
If the code runs successfully but produces no output, return an empty response.
If the code produces an error, return ONLY the Python error traceback.

Code to execute:
\`\`\`python
${code}
\`\`\`
`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Error executing code via Gemini:", error);
    throw new Error("Failed to execute code using the AI. Please try again.");
  }
};