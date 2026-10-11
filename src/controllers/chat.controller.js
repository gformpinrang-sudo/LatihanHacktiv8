import { geminiService } from '../services/gemini.service.js';
import { sanitizePrompt, safeErrorMessage } from '../utils/sanitizer.util.js';

/**
 * Controller untuk multi-turn chat endpoint (/chat).
 */
export class ChatController {
  /**
   * Menangani request pesan chat multi-turn
   */
  static async handleChat(req, res) {
    const message = sanitizePrompt(req.body?.message);
    const rawHistory = req.body?.history;
    const mode = req.body?.mode || 'prd';
    const model = req.body?.model || null;

    if (!message) {
      return res.status(400).json({ message: 'Field "message" wajib diisi.' });
    }

    try {
      const responseData = await geminiService.sendChatMessage(message, rawHistory, mode, model);
      return res.status(200).json(responseData);
    } catch (e) {
      console.error('Error /chat:', e?.message || e);
      return res.status(e?.status || 500).json({ message: safeErrorMessage(e) });
    }
  }
}
