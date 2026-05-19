import { Router } from 'express';
import { prisma } from '@tokopudidi/database';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const checks: Record<string, string> = { api: 'ok' };
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }
  const allOk = Object.values(checks).every((v) => v === 'ok');
  res.status(allOk ? 200 : 503).json({ success: allOk, data: checks });
});
