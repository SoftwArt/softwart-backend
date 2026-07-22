// src/routes/dashboard.routes.ts
import { Router } from 'express'
import { getDashboard } from '../controllers/DashboardController'
import { verifyToken } from '../middlewares/auth.middleware'
import { requirePermission } from '../middlewares/requirePermission.middleware'

const router = Router()

router.use(verifyToken)
router.get('/', requirePermission('PANEL.ACCESO'), getDashboard)

export { router as dashboardRouter }