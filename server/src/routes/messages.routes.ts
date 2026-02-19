import { Router, Request, Response } from 'express';

const router = Router();

// DMs deferred per PRD v1.1 - messaging models removed from schema
router.all('*', (_req: Request, res: Response) => {
  res.status(501).json({
    error: 'Not Implemented',
    message: 'Direct messaging is not yet available.',
  });
});

export default router;
