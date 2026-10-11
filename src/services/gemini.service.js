import { GoogleGenAI } from '@google/genai';
import { ENV } from '../config/env.config.js';
import { SYSTEM_PRESETS } from '../constants/presets.constants.js';

/**
 * Service Layer: Mengabstraksi komunikasi dengan Google GenAI SDK.
 * Memenuhi Dependency Inversion Principle (DIP) & Single Responsibility Principle (SRP).
 */
export class GeminiService {
  /**
   * @param {string} [apiKey]
   * @param {string} [defaultModel]
   * @param {string} [fallbackModel]
   */
  constructor(
    apiKey = ENV.API_KEY,
    defaultModel = ENV.GEMINI_MODEL,
    fallbackModel = ENV.FALLBACK_MODEL
  ) {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
    this.fallbackModel = fallbackModel;
    this.client = new GoogleGenAI({ apiKey: this.apiKey });
  }

  /**
   * Pemanggilan generateContent dengan auto-retry saat status 503 (High Demand).
   * @param {any} contents
   * @param {object} [config]
   * @param {string} [modelOverride]
   * @param {number} [maxRetries=2]
   * @returns {Promise<any>}
   */
  async generateContentWithRetry(
    contents,
    config = {},
    modelOverride = null,
    maxRetries = 2
  ) {
    const model = modelOverride || this.defaultModel;
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const payload = { model, contents };
        if (config && Object.keys(config).length > 0) {
          payload.config = config;
        }
        return await this.client.models.generateContent(payload);
      } catch (err) {
        lastError = err;
        const is503 = err?.status === 503 || err?.message?.includes('503');
        if (is503 && attempt < maxRetries) {
          console.warn(
            `[Retry ${attempt + 1}/${maxRetries}] Model ${model} sibuk (503). Menunggu sebelum mencoba lagi...`
          );
          await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  }

  /**
   * Menjalankan percakapan chat interaktif dengan dukungan model dinamis & fallback model otomatis saat 503.
   * @param {string} message
   * @param {Array} history
   * @param {string} [mode='prd']
   * @param {string} [modelOverride=null]
   * @returns {Promise<{ result: string, history: Array, mode: string, usedModel: string }>}
   */
  async sendChatMessage(message, history = [], mode = 'prd', modelOverride = null) {
    const safeHistory = Array.isArray(history) ? history : [];
    const selectedSystemInstruction = SYSTEM_PRESETS[mode] || SYSTEM_PRESETS.prd;
    const targetModel = modelOverride || this.defaultModel;

    let response;
    let chat;

    try {
      chat = this.client.chats.create({
        model: targetModel,
        history: safeHistory,
        config: {
          systemInstruction: selectedSystemInstruction,
        },
      });
      response = await chat.sendMessage({ message });
    } catch (modelErr) {
      const is503 = modelErr?.status === 503 || modelErr?.message?.includes('503');
      if (is503 && targetModel !== this.fallbackModel) {
        console.warn(
          `[Fallback] Model ${targetModel} sibuk (503). Beralih sementara ke ${this.fallbackModel}...`
        );
        chat = this.client.chats.create({
          model: this.fallbackModel,
          history: safeHistory,
          config: {
            systemInstruction: selectedSystemInstruction,
          },
        });
        response = await chat.sendMessage({ message });
      } else {
        throw modelErr;
      }
    }

    return {
      result: response.text,
      history: chat.getHistory(),
      mode,
      usedModel: targetModel,
    };
  }
}

// Instance default singleton untuk kemudahan Dependency Injection
export const geminiService = new GeminiService();
