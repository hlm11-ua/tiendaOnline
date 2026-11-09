import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/account-auth.js';

export const authRoutes = Router();

authRoutes.post('/registro', AuthController.registro);
authRoutes.post('/login', AuthController.login);
authRoutes.post('/logout', AuthController.logout);
authRoutes.get('/me', requireAuth, AuthController.me);
