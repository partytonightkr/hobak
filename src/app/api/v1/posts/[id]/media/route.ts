import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/server/api-handler';
import { requireAuth } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/server/utils/errors';
import { checkRateLimit } from '@/lib/server/rate-limit';
import { saveUploadedFile } from '@/lib/server/services/upload.service';

const MAX_FILES = 4;

// POST /api/v1/posts/:id/media
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<Record<string, string>> }) => {
  const { id } = await params;
  const user = requireAuth();

  // Rate limit media uploads
  const { allowed } = await checkRateLimit({ windowMs: 15 * 60 * 1000, max: 30, prefix: 'upload' });
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many upload requests, please try again later.' },
      { status: 429 },
    );
  }

  const post = await prisma.post.findUnique({
    where: { id, deletedAt: null },
    select: { authorId: true, mediaUrls: true },
  });

  if (!post) throw new NotFoundError('Post');
  if (post.authorId !== user.userId) throw new ForbiddenError();

  const formData = await req.formData();
  const files = formData.getAll('files');

  if (files.length === 0) {
    throw new ValidationError('No files provided');
  }
  if (files.length > MAX_FILES) {
    throw new ValidationError(`Maximum ${MAX_FILES} files allowed per upload`);
  }

  const newUrls: string[] = [];
  for (const file of files) {
    if (!(file instanceof File)) {
      throw new ValidationError('Invalid file in upload');
    }
    const url = await saveUploadedFile(file);
    newUrls.push(url);
  }

  const updated = await prisma.post.update({
    where: { id },
    data: { mediaUrls: [...post.mediaUrls, ...newUrls] },
    select: { id: true, mediaUrls: true },
  });

  return NextResponse.json(updated);
});
