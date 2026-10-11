import { Router } from 'express';
import { AiController } from '../controllers/ai.controller.js';
import { requireApiKey } from '../middlewares/auth.middleware.js';
import { uploadMedia } from '../middlewares/upload.middleware.js';

const router = Router();

// Semua rute AI membutuhkan validasi API Key
router.use(requireApiKey);

// 1. Text Generation
router.post('/generate-text', AiController.generateText);

// 2. Analisis Media Khusus
router.post('/generate-from-image', uploadMedia, AiController.generateFromImage);
router.post('/generate-from-document', uploadMedia, AiController.generateFromDocument);
router.post('/generate-from-audio', uploadMedia, AiController.generateFromAudio);
router.post('/generate-from-video', uploadMedia, AiController.generateFromVideo);

// 3. Analisis Multimodal Universal
router.post('/generate-multimodal', uploadMedia, AiController.generateMultimodal);

export default router;
