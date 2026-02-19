import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import * as aiAgentService from '../services/ai-agent.service';

const router = Router({ mergeParams: true });

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const captionSchema = z.object({
  imageDescription: z.string().min(1, 'Image description is required').max(1000),
});

const generatePostSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(500),
});

const suggestReplySchema = z.object({
  commentText: z.string().min(1, 'Comment text is required').max(2000),
});

const updateConfigSchema = z.object({
  personalityTraits: z
    .array(z.string().min(1).max(50))
    .max(10, 'Maximum 10 personality traits allowed')
    .optional(),
  temperamentNotes: z.string().max(2000).optional(),
});

// ---------------------------------------------------------------------------
// All routes require authentication
// ---------------------------------------------------------------------------

router.use(authenticate);

// ---------------------------------------------------------------------------
// POST /caption — Generate a photo caption in the dog's voice
// ---------------------------------------------------------------------------

router.post(
  '/caption',
  validate(captionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageDescription } = req.body;
      const result = await aiAgentService.generateCaption(
        req.params.dogId,
        req.user!.userId,
        imageDescription,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /generate-post — Generate a social media post in the dog's voice
// ---------------------------------------------------------------------------

router.post(
  '/generate-post',
  validate(generatePostSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { topic } = req.body;
      const result = await aiAgentService.generatePost(
        req.params.dogId,
        req.user!.userId,
        topic,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /suggest-reply — Suggest a reply to a comment in the dog's voice
// ---------------------------------------------------------------------------

router.post(
  '/suggest-reply',
  validate(suggestReplySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { commentText } = req.body;
      const result = await aiAgentService.suggestReply(
        req.params.dogId,
        req.user!.userId,
        commentText,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// GET /config — Returns the dog's AI config (without system prompt)
// ---------------------------------------------------------------------------

router.get(
  '/config',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await aiAgentService.getAIConfig(
        req.params.dogId,
        req.user!.userId,
      );
      res.json(config);
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------------------------
// POST /config — Update AI config (personality traits -> regenerate prompt)
// ---------------------------------------------------------------------------

router.post(
  '/config',
  validate(updateConfigSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await aiAgentService.updateAIConfig(
        req.params.dogId,
        req.user!.userId,
        req.body,
      );
      res.json(config);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
