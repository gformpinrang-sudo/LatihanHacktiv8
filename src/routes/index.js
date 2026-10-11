import { Router } from 'express';
import { HealthController } from '../controllers/health.controller.js';
import aiRoutes from './ai.routes.js';
import chatRoutes from './chat.routes.js';

const apiRouter = Router();

// Health Check & Root Info
apiRouter.get('/health', HealthController.getHealth);
apiRouter.get('/', HealthController.getRootInfo);

// Sub-routers untuk AI dan Chat
apiRouter.use(aiRoutes);
apiRouter.use(chatRoutes);

export default apiRouter;
