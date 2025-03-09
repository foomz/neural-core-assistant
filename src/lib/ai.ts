import { GoogleGenerativeAI } from '@google/generative-ai';

const OPENROUTER_API_KEY = 'use yor api key';
const GEMINI_API_KEY = 'use your api key';

const openRouterModels = [
  { id: 'deepseek/deepseek-r1-distill-llama-70b:free', name: 'DeepSeek 70B' },
] as const;

const geminiModels = [
  { id: 'gemini-2.0-flash', name: 'Gemini Flash' }
] as const;

export type AIModel = {
  provider: 'openrouter' | 'gemini';
  modelId: typeof openRouterModels[number]['id'] | typeof geminiModels[number]['id'];
};

export async function generateAIResponse(message: string, model: AIModel): Promise<string> {
  try {
    if (model.provider === 'openrouter') {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Neural Core AI',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model.modelId,
          messages: [{ role: 'user', content: message }]
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
    } else {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.modelId}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: message }]
          }]
        })
      });

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    }
  } catch (error) {
    console.error('AI Response Error:', error);
    return 'I apologize, but I encountered an error processing your request. Please try again.';
  }
}

export const availableModels = {
  openrouter: openRouterModels,
  gemini: geminiModels,
};