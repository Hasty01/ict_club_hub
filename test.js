import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "AIzaSyDZl-lwzGp-bhd1qSdB_kvFYkTOW3UQR9Q" });

async function test() {
  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Reply with exactly: hello",
      config: {
        maxOutputTokens: 10
      }
    });
    console.log(res.text);
  } catch (e) {
    console.error("STATUS:", e.status);
    console.error("MESSAGE:", e.message);
    console.error("FULL ERROR:", JSON.stringify(e, null, 2));
  }
}

test();