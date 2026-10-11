import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller.js';
import { requireApiKey } from '../middlewares/auth.middleware.js';

const router = Router();

// Rute Chat multi-turn membutuhkan API Key
router.post('/chat', requireApiKey, ChatController.handleChat);

export default router;
