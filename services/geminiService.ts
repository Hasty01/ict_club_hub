
// Robustly retrieve API Key, prioritizing HF_TOKEN
const getApiKey = (): string => {
  let key = '';
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      key = import.meta.env.VITE_HF_TOKEN || import.meta.env.HF_TOKEN || import.meta.env.VITE_API_KEY || import.meta.env.API_KEY || '';
    }
  } catch (e) {}

  if (key) return key;

  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      key = process.env.HF_TOKEN || process.env.VITE_HF_TOKEN || process.env.VITE_API_KEY || process.env.API_KEY || process.env.REACT_APP_API_KEY || '';
    }
  } catch (e) {}

  return key;
};

const apiKey = getApiKey();

if (!apiKey) {
    console.warn("AI API Key is missing. AI features will be disabled. Ensure VITE_HF_TOKEN is set.");
}

const MODEL_NAME = "openai/gpt-oss-20b";
const API_ENDPOINT = `https://router.huggingface.co/v1/chat/completions`;

// Helper to clean regular text responses
const cleanResponse = (text: string): string => {
    if (!text) return "";
    return text.trim();
};

// Helper to parse JSON from AI response, handling potential markdown wrapping
const parseJSONResponse = (text: string) => {
    const cleaned = text.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '').trim();
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Failed to parse JSON from AI:", cleaned);
        // Fallback for when AI wraps JSON in other text
        const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
            try { return JSON.parse(jsonMatch[0]); } catch(e2) {}
        }
        throw new Error("AI returned invalid JSON format.");
    }
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

// --- Core API Call Helper ---
const callAI = async (messages: any[]): Promise<string> => {
    if (!apiKey) throw new Error("AI Service Unavailable: API Key not configured.");

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: messages,
                temperature: 0.7,
                max_tokens: 4096,
                stream: false,
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Hugging Face API Error Response:", errorText);
            if (response.status === 503) {
                throw new Error("Model is loading (503). Please try again in a few seconds.");
            }
            throw new Error(`AI API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    } catch (error: any) {
        console.error("AI Call Failed:", error);
        throw new Error("Connection error.");
    }
};

export interface QuizQuestion {
    type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
    question: string;
    options?: string[];
    correctAnswer: string;
}

export interface PythonTip {
    title: string;
    explanation: string;
    codeSnippet: string;
}

export const getAiTutorResponse = async (
    history: { role: 'user' | 'model', parts: { text: string }[] }[], 
    message: string,
    clubContext: string = ''
) => {
    if (!apiKey) return "I'm offline right now (API Key Missing).";

    try {
        const chatMessages = history.map(h => ({
            role: h.role === 'model' ? 'assistant' : 'user',
            content: h.parts[0]?.text || ""
        }));

        const systemPrompt = `You are a friendly, patient, and wise AI Tutor for a high school ICT Club. 
        Your goal is to TEACH, not to do the work for the students. 
        
        DETECT LANGUAGE: Automatically identify if the student is asking about Python or JavaScript.
        
        REAL-TIME CLUB INFORMATION:
        ${clubContext}
        
        CRITICAL RULES:
        1. DO NOT write complete code solutions. Provide hints or pseudo-code.
        2. Explain concepts specific to the language being used (e.g., Python PEP 8 vs JS ES6+).
        3. Be encouraging and use emojis.
        `;

        const messages: any[] = [
            { role: "system", content: systemPrompt },
            ...chatMessages,
            { role: "user", content: message }
        ];

        const rawText = await callAI(messages);
        return cleanResponse(rawText);
    } catch (error) {
        console.error("Tutor Error:", error);
        return "I'm having trouble thinking right now. Ask me again in a moment!";
    }
};

export const generateLearningRoadmap = async (topic: string, skillLevel: string, language: string = 'Python', suggestedTopics?: string) => {
    const prompt = `
        Create a comprehensive learning roadmap for "${topic}" in ${language}.
        Target Level: ${skillLevel}.
        Additional Context: ${suggestedTopics || 'None'}.
        
        Return a VALID JSON object with a "milestones" array.
        Each milestone must have:
        - title: Name of the step.
        - description: One sentence learning goal.
        - duration: e.g. "3 days".
        - resources: Array of { type: "VIDEO"|"ARTICLE"|"DOCS"|"PRACTICE", title: "...", url: "..." }.
        
        Ensure terminology matches ${language}.
    `;

    try {
        const text = await callAI([
            { role: "system", content: "You output strict JSON only." }, 
            { role: "user", content: prompt }
        ]);
        const parsed = parseJSONResponse(text);
        return parsed.milestones;
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
        throw new Error("Could not read file.");
    }

    if (fileContent.length > 20000) fileContent = fileContent.substring(0, 20000);

    const prompt = `Summarize the following document for high school ICT students in 2-3 engaging sentences:\n\n${fileContent}`;

    try {
        const text = await callAI([{ role: "user", content: prompt }]);
        return cleanResponse(text);
    } catch (error) {
        throw error;
    }
};

export const gradeProjectSubmission = async (taskDescription: string, code: string): Promise<{ grade: number, feedback: string }> => {
    const isJS = /const|let|function|=>|console\.log/.test(code);
    const language = isJS ? 'JavaScript' : 'Python';

    const prompt = `
        Grade this ${language} submission for task: "${taskDescription}".
        Code:
        \`\`\`${language.toLowerCase()}
        ${code}
        \`\`\`
        
        Return JSON:
        { "grade": number (1-5), "feedback": "constructive paragraph based on ${language} best practices" }
    `;

    try {
        const text = await callAI([
            { role: "system", content: "Output strict JSON only." }, 
            { role: "user", content: prompt }
        ]);
        return parseJSONResponse(text);
    } catch (error) {
        throw error;
    }
};

export const getAIPlaygroundHint = async (code: string, language: string = 'python'): Promise<string> => {
    const prompt = `
        You are a ${language} mentor. Analyze this snippet and provide ONE improvement:
        \`\`\`${language}
        ${code}
        \`\`\`
    `;

    try {
        const text = await callAI([{ role: "user", content: prompt }]);
        return cleanResponse(text);
    } catch (error) {
        throw error;
    }
};

export const analyzeChallengeSubmission = async (challengeTitle: string, code: string) => {
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
        const text = await callAI([{ role: "user", content: prompt }]);
        return cleanResponse(text);
    } catch (error) {
        throw error;
    }
};

export const generateMilestoneQuiz = async (title: string, description: string): Promise<QuizQuestion[]> => {
    const prompt = `
        Generate a 3-question quiz for: "${title}".
        Description: "${description}"
        Return VALID JSON: { "questions": [ { "type": "MULTIPLE_CHOICE"|"TRUE_FALSE"|"SHORT_ANSWER", "question": "...", "options": [...], "correctAnswer": "..." } ] }
    `;

    try {
        const text = await callAI([
            { role: "system", content: "Output strict JSON only." }, 
            { role: "user", content: prompt }
        ]);
        return parseJSONResponse(text).questions;
    } catch (error) {
        throw error;
    }
};

export const evaluateShortAnswer = async (question: string, userAnswer: string, expectedAnswer: string): Promise<{ correct: boolean, feedback: string }> => {
    const prompt = `
        Grade this answer. 
        Question: "${question}"
        Correct: "${expectedAnswer}"
        User: "${userAnswer}"
        Return JSON: { "correct": boolean, "feedback": "reason" }
    `;

    try {
        const text = await callAI([
            { role: "system", content: "Output strict JSON only." }, 
            { role: "user", content: prompt }
        ]);
        return parseJSONResponse(text);
    } catch (error) {
        return { correct: false, feedback: "Error validating answer." };
    }
};

export const generatePythonTip = async (): Promise<PythonTip> => {
    const prompt = `
        Generate a Python coding tip for high school students.
        Return VALID JSON: { "title": "...", "explanation": "...", "codeSnippet": "..." }
    `;

    try {
        const text = await callAI([
            { role: "system", content: "Output strict JSON only." }, 
            { role: "user", content: prompt }
        ]);
        return parseJSONResponse(text);
    } catch (error) {
        throw error;
    }
};
