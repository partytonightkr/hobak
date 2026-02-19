import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { AppError, ForbiddenError, NotFoundError } from '../utils/errors';

// ---------------------------------------------------------------------------
// Anthropic client (lazy-initialized, same pattern as stripe.service.ts)
// ---------------------------------------------------------------------------

let _anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new AppError(
      'Anthropic API is not configured. Set ANTHROPIC_API_KEY environment variable.',
      500,
    );
  }
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

function anthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = getAnthropicClient();
  }
  return _anthropic;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FREE_TIER_DAILY_LIMIT = 10;
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_CAPTION_TOKENS = 120;
const MAX_POST_TOKENS = 150;
const MAX_REPLY_TOKENS = 120;

// ---------------------------------------------------------------------------
// Personality-trait-to-behavior mapping
// ---------------------------------------------------------------------------

const TRAIT_BEHAVIORS: Record<string, string> = {
  friendly: 'always excited to meet new friends and greet everyone with a wagging tail',
  playful: 'always looking for a game of fetch or tug-of-war and full of puppy energy',
  lazy: 'a champion napper who prefers the couch over the park',
  energetic: 'bouncing off the walls with limitless energy and zoomies',
  shy: 'a little timid at first but warm and affectionate once comfortable',
  protective: 'always keeping a watchful eye on your pack and territory',
  curious: 'constantly sniffing out new things and exploring every corner',
  stubborn: 'independent-minded and does things on your own schedule',
  affectionate: 'a total cuddle bug who loves belly rubs and being close to your humans',
  clever: 'quick to learn tricks and always figuring out how to open treat jars',
  mischievous: 'always getting into things you shouldn\'t and looking adorable doing it',
  loyal: 'devoted to your family above all else and always by their side',
  calm: 'mellow and relaxed, the zen master of dogs',
  goofy: 'a total clown who makes everyone laugh with your silly antics',
  adventurous: 'ready for any outdoor adventure, from hiking trails to swimming holes',
  gentle: 'tender and careful, especially around small humans and other animals',
  bold: 'fearless and confident, first to investigate anything new',
  sassy: 'full of attitude, opinionated, and not afraid to bark your mind',
};

// ---------------------------------------------------------------------------
// Helper: calculate age from date of birth
// ---------------------------------------------------------------------------

function calculateAge(dateOfBirth: Date | null): string {
  if (!dateOfBirth) return 'unknown-age';

  const now = new Date();
  const birth = new Date(dateOfBirth);
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    years--;
  }

  if (years < 1) {
    // Calculate months for puppies
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (now.getDate() < birth.getDate()) months--;
    if (months <= 0) return 'newborn';
    return `${months}-month-old`;
  }

  return `${years}-year-old`;
}

// ---------------------------------------------------------------------------
// System prompt generation
// ---------------------------------------------------------------------------

export function buildSystemPrompt(dog: {
  name: string;
  breed: string;
  dateOfBirth: Date | null;
  size: string | null;
  personalityTraits: string[];
  temperamentNotes: string | null;
}): string {
  const age = calculateAge(dog.dateOfBirth);

  // Map personality traits to behavioral descriptions
  const traitBehaviors = dog.personalityTraits
    .map((trait) => {
      const lower = trait.toLowerCase().trim();
      return TRAIT_BEHAVIORS[lower] || `known for being ${lower}`;
    })
    .join('; ');

  const traitsDisplay = dog.personalityTraits.length > 0
    ? dog.personalityTraits.join(', ')
    : 'a lovable dog';

  const temperament = dog.temperamentNotes
    ? `\nTemperament: ${dog.temperamentNotes}.`
    : '';

  const sizeNote = dog.size
    ? ` You are a ${dog.size.toLowerCase()}-sized dog.`
    : '';

  return [
    `You are ${dog.name}, a ${age} ${dog.breed}.${sizeNote}`,
    `Your personality traits: ${traitsDisplay}.${temperament}`,
    `You speak in first person as a dog. You are ${traitBehaviors || 'a good dog who loves their humans'}.`,
    `Keep responses short (1-3 sentences), playful, and in character.`,
    `Never generate harmful, offensive, or misleading content.`,
    `Never reveal that you are an AI. Stay in character as a dog at all times.`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Content safety check
// ---------------------------------------------------------------------------

const BLOCKED_PATTERNS = [
  // Harmful or dangerous content
  /\b(kill|murder|attack|bite|maul|hurt)\s+(human|person|people|child|kid|baby)/i,
  // Offensive slurs (broad catch — extend as needed)
  /\b(slur|hate\s+speech)\b/i,
  // Misinformation-prone medical claims
  /\b(cure|treat|heal)\s+(cancer|disease|illness|covid)/i,
  // Encouraging illegal activity
  /\b(steal|rob|break\s+in|poison)\b/i,
];

export function isContentSafe(text: string): { safe: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        safe: false,
        reason: 'Generated content violated our content policy and was blocked.',
      };
    }
  }
  return { safe: true };
}

// ---------------------------------------------------------------------------
// Rate limiting helpers
// ---------------------------------------------------------------------------

async function checkAndIncrementInteractions(
  dogId: string,
  isPremium: boolean,
): Promise<void> {
  const config = await prisma.dogAIConfig.findUnique({
    where: { dogId },
  });

  if (!config) {
    throw new NotFoundError('Dog AI configuration');
  }

  // Reset daily counter if last interaction was on a different day
  const now = new Date();
  const lastInteraction = config.lastInteractionAt;
  const isNewDay =
    !lastInteraction ||
    lastInteraction.toDateString() !== now.toDateString();

  const currentCount = isNewDay ? 0 : config.interactionsToday;

  // Check limit for free-tier users
  if (!isPremium && currentCount >= FREE_TIER_DAILY_LIMIT) {
    throw new ForbiddenError(
      `Daily AI interaction limit reached (${FREE_TIER_DAILY_LIMIT}/day). Upgrade to Premium for unlimited interactions.`,
    );
  }

  // Increment counter
  await prisma.dogAIConfig.update({
    where: { dogId },
    data: {
      interactionsToday: isNewDay ? 1 : { increment: 1 },
      lastInteractionAt: now,
    },
  });
}

// ---------------------------------------------------------------------------
// Core: call Claude API
// ---------------------------------------------------------------------------

async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  modelId: string,
): Promise<string> {
  const response = await anthropic().messages.create({
    model: modelId,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  // Extract text from the response
  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new AppError('AI model returned an empty response', 500);
  }

  return textBlock.text.trim();
}

// ---------------------------------------------------------------------------
// Fetch dog + AI config (shared by all generation functions)
// ---------------------------------------------------------------------------

async function getDogWithConfig(dogId: string, userId: string) {
  const dog = await prisma.dog.findUnique({
    where: { id: dogId },
    include: {
      aiConfig: true,
      owner: {
        select: {
          id: true,
          isPremium: true,
        },
      },
    },
  });

  if (!dog || dog.deletedAt) {
    throw new NotFoundError('Dog');
  }

  // Verify the requesting user is the dog's owner
  if (dog.ownerId !== userId) {
    throw new ForbiddenError('Only the dog\'s owner can use AI features');
  }

  return dog;
}

// ---------------------------------------------------------------------------
// Ensure AI config exists (create with generated system prompt if missing)
// ---------------------------------------------------------------------------

async function ensureAIConfig(dogId: string) {
  let config = await prisma.dogAIConfig.findUnique({
    where: { dogId },
  });

  if (!config) {
    const dog = await prisma.dog.findUnique({
      where: { id: dogId },
      select: {
        name: true,
        breed: true,
        dateOfBirth: true,
        size: true,
        personalityTraits: true,
        temperamentNotes: true,
      },
    });

    if (!dog) {
      throw new NotFoundError('Dog');
    }

    const systemPrompt = buildSystemPrompt(dog);

    config = await prisma.dogAIConfig.create({
      data: {
        dogId,
        systemPrompt,
        modelId: DEFAULT_MODEL,
      },
    });
  }

  return config;
}

// ---------------------------------------------------------------------------
// Public API: generateCaption
// ---------------------------------------------------------------------------

export async function generateCaption(
  dogId: string,
  userId: string,
  imageDescription: string,
): Promise<{ caption: string; aiModel: string }> {
  const dog = await getDogWithConfig(dogId, userId);
  const config = await ensureAIConfig(dogId);

  // Rate limit check
  await checkAndIncrementInteractions(dogId, dog.owner.isPremium);

  const userMessage = `Write a short, fun photo caption for this image in your voice as a dog. The image shows: ${imageDescription}. Keep it to 1-2 sentences.`;

  let caption = await callClaude(
    config.systemPrompt,
    userMessage,
    MAX_CAPTION_TOKENS,
    config.modelId,
  );

  // Content safety check
  const safety = isContentSafe(caption);
  if (!safety.safe) {
    throw new AppError(safety.reason || 'Content policy violation', 400);
  }

  return { caption, aiModel: config.modelId };
}

// ---------------------------------------------------------------------------
// Public API: generatePost
// ---------------------------------------------------------------------------

export async function generatePost(
  dogId: string,
  userId: string,
  topic: string,
): Promise<{ content: string; aiModel: string }> {
  const dog = await getDogWithConfig(dogId, userId);
  const config = await ensureAIConfig(dogId);

  // Rate limit check
  await checkAndIncrementInteractions(dogId, dog.owner.isPremium);

  const userMessage = `Write a social media post (max 280 characters) in your voice as a dog about: ${topic}. Be playful and in character.`;

  let content = await callClaude(
    config.systemPrompt,
    userMessage,
    MAX_POST_TOKENS,
    config.modelId,
  );

  // Enforce 280-char limit if the model overshoots
  if (content.length > 280) {
    content = content.substring(0, 277) + '...';
  }

  // Content safety check
  const safety = isContentSafe(content);
  if (!safety.safe) {
    throw new AppError(safety.reason || 'Content policy violation', 400);
  }

  return { content, aiModel: config.modelId };
}

// ---------------------------------------------------------------------------
// Public API: suggestReply
// ---------------------------------------------------------------------------

export async function suggestReply(
  dogId: string,
  userId: string,
  commentText: string,
): Promise<{ reply: string; aiModel: string }> {
  const dog = await getDogWithConfig(dogId, userId);
  const config = await ensureAIConfig(dogId);

  // Rate limit check
  await checkAndIncrementInteractions(dogId, dog.owner.isPremium);

  const userMessage = `Someone commented on your post: "${commentText}". Write a short, playful reply in your voice as a dog. Keep it to 1-2 sentences.`;

  let reply = await callClaude(
    config.systemPrompt,
    userMessage,
    MAX_REPLY_TOKENS,
    config.modelId,
  );

  // Content safety check
  const safety = isContentSafe(reply);
  if (!safety.safe) {
    throw new AppError(safety.reason || 'Content policy violation', 400);
  }

  return { reply, aiModel: config.modelId };
}

// ---------------------------------------------------------------------------
// Public API: getAIConfig (returns config without system prompt)
// ---------------------------------------------------------------------------

export async function getAIConfig(dogId: string, userId: string) {
  const dog = await getDogWithConfig(dogId, userId);
  const config = await ensureAIConfig(dogId);

  return {
    id: config.id,
    dogId: config.dogId,
    modelId: config.modelId,
    interactionsToday: config.interactionsToday,
    lastInteractionAt: config.lastInteractionAt,
    dailyLimit: dog.owner.isPremium ? null : FREE_TIER_DAILY_LIMIT,
    isPremium: dog.owner.isPremium,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Public API: updateAIConfig (regenerates system prompt from dog data)
// ---------------------------------------------------------------------------

export async function updateAIConfig(
  dogId: string,
  userId: string,
  updates: {
    personalityTraits?: string[];
    temperamentNotes?: string;
  },
) {
  const dog = await getDogWithConfig(dogId, userId);

  // Update dog personality data if provided
  const updateData: Record<string, unknown> = {};
  if (updates.personalityTraits !== undefined) {
    updateData.personalityTraits = updates.personalityTraits;
  }
  if (updates.temperamentNotes !== undefined) {
    updateData.temperamentNotes = updates.temperamentNotes;
  }

  let updatedDog = dog;
  if (Object.keys(updateData).length > 0) {
    updatedDog = await prisma.dog.update({
      where: { id: dogId },
      data: updateData,
      include: {
        aiConfig: true,
        owner: {
          select: {
            id: true,
            isPremium: true,
          },
        },
      },
    });
  }

  // Regenerate system prompt from updated dog data
  const newSystemPrompt = buildSystemPrompt({
    name: updatedDog.name,
    breed: updatedDog.breed,
    dateOfBirth: updatedDog.dateOfBirth,
    size: updatedDog.size,
    personalityTraits: updatedDog.personalityTraits,
    temperamentNotes: updatedDog.temperamentNotes,
  });

  // Upsert the AI config
  const config = await prisma.dogAIConfig.upsert({
    where: { dogId },
    create: {
      dogId,
      systemPrompt: newSystemPrompt,
      modelId: DEFAULT_MODEL,
    },
    update: {
      systemPrompt: newSystemPrompt,
    },
  });

  return {
    id: config.id,
    dogId: config.dogId,
    modelId: config.modelId,
    interactionsToday: config.interactionsToday,
    lastInteractionAt: config.lastInteractionAt,
    dailyLimit: updatedDog.owner.isPremium ? null : FREE_TIER_DAILY_LIMIT,
    isPremium: updatedDog.owner.isPremium,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}
