import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to clean regular text responses
const cleanResponse = (text: string | undefined): string => {
    if (!text) return "";
    return text.trim();
};

// --- Helper to convert File to Text ---
const fileToText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || "");
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
};

export interface ActivityIdea {
  title: string;
  description: string;
  location: string;
}

export const generateClubActivityIdea = async (): Promise<ActivityIdea> => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `You are an enthusiastic and creative patron for a high school ICT Club. 
    Generate ONE detailed and exciting activity idea for the club.
    It should be feasible for a school setting, educational, and engaging.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          location: { type: Type.STRING }
        },
        required: ["title", "description", "location"]
      }
    }
  });

  return JSON.parse(response.text || '{}') as ActivityIdea;
};

export const getAIChatResponse = async (history: { role: 'user' | 'model', parts: { text: string }[] }[], message: string) => {
    try {
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history,
            config: {
                systemInstruction: "You are the helpful AI Assistant for the ICT Club. You help members with coding questions, project ideas, and club logistics. Be concise and clear, encouraging, and tech-savvy."
            }
        });
        const result = await chat.sendMessage({ message });
        return cleanResponse(result.text);
    } catch (error) {
        console.error("Chat Error:", error);
        return "I'm having trouble connecting to the server right now. Please try again later.";
    }
};

export const getAiTutorResponse = async (
    history: { role: 'user' | 'model', parts: { text: string }[] }[], 
    message: string,
    clubContext: string = ''
) => {
    try {
        const systemPrompt = `You are a friendly, patient, and wise AI Tutor for a high school ICT Club. 
        Your goal is to TEACH, not to do the work for the students. Keep your explanations concise and easy to understand.
        
        REAL-TIME CLUB INFORMATION:
        ${clubContext}
        
        CRITICAL RULES:
        1. DO NOT write complete code solutions for homework. Provide hints, pseudo-code, or explain concepts.
        2. Fix syntax errors in *their* code if asked, but explain the fix.
        3. Be encouraging and use emojis.
        4. If asked about club activities, use the provided context.
        `;

        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history,
            config: {
                systemInstruction: systemPrompt
            }
        });

        const result = await chat.sendMessage({ message });
        return cleanResponse(result.text);
    } catch (error) {
        console.error("Tutor Error:", error);
        return "I'm having trouble thinking right now. Ask me again in a moment!";
    }
};

export const analyzeChallengeSubmission = async (challengeTitle: string, code: string) => {
    const prompt = `
      You are a friendly but rigorous Code Mentor. Review this Python submission for: "${challengeTitle}".
      
      Student Code:
      \`\`\`python
      ${code}
      \`\`\`
      
      Provide a structured review in Markdown:
      **🧐 Analysis**: Does it solve the problem? Logic check.
      **🚀 Style & Efficiency**: Comments on naming, complexity, pythonic style.
      **💡 Better Approach**: A short, optimized code snippet example.
      **🌟 Verdict**: A closing motivating sentence.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return cleanResponse(response.text);
    } catch (error) {
        console.error("Analysis Error:", error);
        throw error;
    }
};

export const generateLearningRoadmap = async (topic: string, skillLevel: string, suggestedTopics?: string) => {
    const prompt = `
        Create a comprehensive learning roadmap with at least 10 milestones for "${topic}" suitable for a "${skillLevel}" student.
        If provided, incorporate: "${suggestedTopics || 'Not provided'}".
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
                                                title: { type: Type.STRING },
                                                type: { type: Type.STRING, enum: ["VIDEO", "ARTICLE", "DOCS", "PRACTICE"] },
                                                url: { type: Type.STRING }
                                            },
                                            required: ["title", "type", "url"]
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
        
        const parsed = JSON.parse(response.text || '{}');
        return parsed.milestones || [];
    } catch (error) {
        console.error("Roadmap Error:", error);
        throw error;
    }
};

export const generateDocumentSummary = async (file: File): Promise<string> => {
    let fileContent = "";
    try {
        fileContent = await fileToText(file);
    } catch (e) {
        throw new Error("Could not read file. Please ensure it is a text-based file (code, txt, md).");
    }

    if (fileContent.length > 20000) fileContent = fileContent.substring(0, 20000) + "...[Truncated]";

    const prompt = `Summarize the following document content in a concise, engaging paragraph (2-4 sentences) for a resource library:\n\n${fileContent}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return cleanResponse(response.text);
    } catch (error) {
        console.error("Summary Error:", error);
        throw error;
    }
};

export type QuizQuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export interface QuizQuestion {
    id: number;
    type: QuizQuestionType;
    question: string;
    options?: string[]; 
    correctAnswer: string; 
}

export const generateMilestoneQuiz = async (milestoneTitle: string, milestoneDescription: string): Promise<QuizQuestion[]> => {
    const prompt = `
        Generate a 10-question quiz on: ${milestoneTitle} - ${milestoneDescription}.
        Mix MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
                                    type: { type: Type.STRING, enum: ["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER"] },
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

        const parsed = JSON.parse(response.text || '{}');
        return (parsed.questions || []).map((q: any, index: number) => ({...q, id: index}));
    } catch (error) {
        console.error("Quiz Error:", error);
        throw error;
    }
};

export const evaluateShortAnswer = async (question: string, userAnswer: string, context: string): Promise<{ correct: boolean, feedback: string }> => {
    const prompt = `
        Grade this student answer.
        Question: "${question}"
        Context/Correct Answer: "${context}"
        Student Answer: "${userAnswer}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
        
        return JSON.parse(response.text || '{}');
    } catch (error) {
        console.error("Grading Error:", error);
        return { correct: true, feedback: "Good effort! (Auto-passed due to connection error)" };
    }
};

export const gradeProjectSubmission = async (taskDescription: string, code: string): Promise<{ grade: number, feedback: string }> => {
    const prompt = `
        Grade this Python code submission for task: "${taskDescription}".
        Code:
        \`\`\`python
        ${code}
        \`\`\`
        
        Criteria: Correctness, Style, Efficiency.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        grade: { type: Type.INTEGER, description: "Grade from 1 to 5" },
                        feedback: { type: Type.STRING, description: "Short constructive paragraph" }
                    },
                    required: ["grade", "feedback"]
                }
            }
        });

        return JSON.parse(response.text || '{}');
    } catch (error) {
        console.error("Auto-grading Error:", error);
        throw error;
    }
};

export const getAIPlaygroundHint = async (code: string): Promise<string> => {
    const prompt = `
        You are a Python code mentor. Analyze this code and identify ONE specific improvement (logic or pythonic style).
        Student Code:
        \`\`\`python
        ${code}
        \`\`\`
        
        Provide:
        1. Short explanation.
        2. A code snippet inside \`\`\`python ... \`\`\` showing the improvement.
        Keep it encouraging.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return cleanResponse(response.text);
    } catch (error) {
        console.error("Hint Error:", error);
        throw error;
    }
};

export interface PythonTip {
    title: string;
    explanation: string;
    codeSnippet: string;
}

export const generatePythonTip = async (): Promise<PythonTip> => {
    const prompt = `
        Generate an intermediate Python tip using built-in features (no imports).
        Focus on: List/Dict comprehensions, slicing, unpacking, f-strings, etc.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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

        return JSON.parse(response.text || '{}') as PythonTip;
    } catch (error: any) {
        console.error("Tip Error:", error);
        return {
            title: "Pythonic Swapping",
            explanation: "Did you know you can swap variables in Python without a temporary variable? It's readable and efficient!",
            codeSnippet: "a = 5\nb = 10\n\n# The Pythonic Way\na, b = b, a\n\nprint(f'a: {a}, b: {b}')"
        };
    }
};