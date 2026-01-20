
import { GoogleGenAI, Type } from "@google/genai";

/**
 * White screen fix: Safely retrieve API Key without assuming process.env is defined globally.
 */
const getApiKey = (): string => {
  try {
    // @ts-ignore
    return import.meta.env.VITE_API_KEY || process.env.API_KEY || '';
  } catch (e) {
    try {
      // @ts-ignore
      return process.env.API_KEY || '';
    } catch (e2) {
      return '';
    }
  }
};

const apiKey = getApiKey();

// Initialize the Gemini API client
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

if (!apiKey) {
    console.warn("AI API Key is missing. AI features will be disabled.");
}

const TEXT_MODEL = 'gemini-3-pro-preview';
const FLASH_MODEL = 'gemini-3-flash-preview';

const cleanResponse = (text: string): string => {
    if (!text) return "";
    return text.trim();
};

export interface QuizQuestion {
    type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
    question: string;
    options?: string[];
    correctAnswer: string;
}

export interface CodingTip {
    title: string;
    explanation: string;
    codeSnippet: string;
    language: 'python' | 'javascript';
}

export const getAiTutorResponse = async (
    history: { role: 'user' | 'model', parts: { text: string }[] }[], 
    message: string,
    clubContext: string = ''
) => {
    if (!ai) return "I'm offline right now (API Key Missing).";

    try {
        const systemInstruction = `You are a friendly, patient, and wise AI Tutor for a high school ICT Club. 
        Your goal is to TEACH, not to do the work for the students. 
        
        DETECT LANGUAGE: Automatically identify if the student is asking about Python or JavaScript.
        
        REAL-TIME CLUB INFORMATION:
        ${clubContext}
        
        CRITICAL RULES:
        1. DO NOT write complete code solutions. Provide hints or pseudo-code.
        2. Explain concepts specific to the language being used (e.g., Python PEP 8 vs JS ES6+).
        3. Be encouraging and use emojis.
        `;

        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: [
                ...history.map(h => ({
                    role: h.role === 'model' ? 'model' : 'user',
                    parts: [{ text: h.parts[0].text }]
                })),
                { role: 'user', parts: [{ text: message }] }
            ],
            config: {
                systemInstruction,
                temperature: 0.7,
            }
        });

        return cleanResponse(response.text || "");
    } catch (error) {
        console.error("Tutor Error:", error);
        return "I'm having trouble thinking right now. Ask me again in a moment!";
    }
};

export const generateLearningRoadmap = async (topic: string, skillLevel: string, language: string = 'Python', suggestedTopics?: string) => {
    if (!ai) throw new Error("AI Service missing");
    const prompt = `
        Create a comprehensive learning roadmap for "${topic}" in ${language}.
        Target Level: ${skillLevel}.
        Additional Context: ${suggestedTopics || 'None'}.
        
        Return a milestones array matching the structure.
        Ensure terminology matches ${language}.
    `;

    try {
        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        milestones: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    duration: { type: Type.STRING },
                                    resources: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                type: { type: Type.STRING, description: "One of VIDEO, ARTICLE, DOCS, PRACTICE" },
                                                title: { type: Type.STRING },
                                                url: { type: Type.STRING }
                                            },
                                            required: ["type", "title", "url"]
                                        }
                                    }
                                },
                                required: ["title", "description", "duration", "resources"]
                            }
                        }
                    },
                    required: ["milestones"]
                }
            }
        });
        
        const parsed = JSON.parse(response.text || "{}");
        return parsed.milestones;
    } catch (error) {
        console.error("Roadmap Error:", error);
        throw error;
    }
};

export const generateDocumentSummary = async (file: File): Promise<string> => {
    if (!ai) throw new Error("AI Service missing");
    
    const fileToText = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve((e.target?.result as string) || "");
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    };

    let fileContent = "";
    try {
        fileContent = await fileToText(file);
    } catch (e) {
        throw new Error("Could not read file.");
    }

    if (fileContent.length > 20000) fileContent = fileContent.substring(0, 20000);

    const prompt = `Summarize the following document for high school ICT students in 2-3 engaging sentences:\n\n${fileContent}`;

    try {
        const response = await ai.models.generateContent({
            model: FLASH_MODEL,
            contents: prompt
        });
        return cleanResponse(response.text || "");
    } catch (error) {
        throw error;
    }
};

export const gradeProjectSubmission = async (taskDescription: string, code: string): Promise<{ grade: number, feedback: string }> => {
    if (!ai) throw new Error("AI Service missing");
    const isJS = /const|let|function|=>|console\.log/.test(code);
    const language = isJS ? 'JavaScript' : 'Python';

    const prompt = `
        Grade this ${language} submission for task: "${taskDescription}".
        Code:
        \`\`\`${language.toLowerCase()}
        ${code}
        \`\`\`
    `;

    try {
        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        grade: { type: Type.NUMBER, description: "Grade from 1 to 5" },
                        feedback: { type: Type.STRING, description: "Constructive feedback" }
                    },
                    required: ["grade", "feedback"]
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) {
        throw error;
    }
};

export const getAIPlaygroundHint = async (code: string, language: string = 'python'): Promise<string> => {
    if (!ai) throw new Error("AI Service missing");
    const prompt = `
        You are a ${language} mentor. Analyze this snippet and provide ONE improvement:
        \`\`\`${language}
        ${code}
        \`\`\`
    `;

    try {
        const response = await ai.models.generateContent({
            model: FLASH_MODEL,
            contents: prompt
        });
        return cleanResponse(response.text || "");
    } catch (error) {
        throw error;
    }
};

export const analyzeChallengeSubmission = async (challengeTitle: string, code: string) => {
    if (!ai) throw new Error("AI Service missing");
    const isJS = /const|let|function|=>|console\.log/.test(code);
    const language = isJS ? 'JavaScript' : 'Python';
    
    const prompt = `
      Review this ${language} solution for: "${challengeTitle}".
      Code:
      \`\`\`${language.toLowerCase()}
      ${code}
      \`\`\`
      
      Structure in Markdown: Analysis, Style, Verdict.
    `;

    try {
        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: prompt
        });
        return cleanResponse(response.text || "");
    } catch (error) {
        throw error;
    }
};

export const generateMilestoneQuiz = async (title: string, description: string): Promise<QuizQuestion[]> => {
    if (!ai) throw new Error("AI Service missing");
    const prompt = `
        Generate a 3-question quiz for: "${title}".
        Description: "${description}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: TEXT_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        questions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING, description: "MULTIPLE_CHOICE, TRUE_FALSE, or SHORT_ANSWER" },
                                    question: { type: Type.STRING },
                                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    correctAnswer: { type: Type.STRING }
                                },
                                required: ["type", "question", "correctAnswer"]
                            }
                        }
                    },
                    required: ["questions"]
                }
            }
        });
        const parsed = JSON.parse(response.text || "{}");
        return parsed.questions;
    } catch (error) {
        throw error;
    }
};

export const evaluateShortAnswer = async (question: string, userAnswer: string, expectedAnswer: string): Promise<{ correct: boolean, feedback: string }> => {
    if (!ai) throw new Error("AI Service missing");
    const prompt = `
        Grade this answer. 
        Question: "${question}"
        Correct: "${expectedAnswer}"
        User: "${userAnswer}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: FLASH_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        correct: { type: Type.BOOLEAN },
                        feedback: { type: Type.STRING }
                    },
                    required: ["correct", "feedback"]
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) {
        return { correct: false, feedback: "Error validating answer." };
    }
};

export const generateCodingTip = async (lang: 'python' | 'javascript'): Promise<CodingTip> => {
    if (!ai) throw new Error("AI Service missing");
    const prompt = `
        Generate a ${lang === 'python' ? 'Python' : 'JavaScript'} coding tip for high school students.
        Focus on modern best practices (ES6+ for JS, PEP 8 for Python).
    `;

    try {
        const response = await ai.models.generateContent({
            model: FLASH_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        explanation: { type: Type.STRING },
                        codeSnippet: { type: Type.STRING }
                    },
                    required: ["title", "explanation", "codeSnippet"]
                }
            }
        });
        const result = JSON.parse(response.text || "{}");
        return { ...result, language: lang };
    } catch (error) {
        throw error;
    }
};

// Legacy support
export const generatePythonTip = () => generateCodingTip('python');
