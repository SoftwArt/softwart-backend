// src/routes/dashboard.routes.ts
import { Router } from 'express'
import { getDashboard } from '../controllers/DashboardController'
import { verifyToken, requireRol } from '../middlewares/auth.middleware'

const router = Router()

router.use(verifyToken, requireRol('Admin', 'Empleado'))
router.get('/', getDashboard)

export { router as dashboardRouter }