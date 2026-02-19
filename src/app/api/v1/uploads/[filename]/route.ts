import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSafeContentType } from '@/lib/server/services/upload.service';

// GET /api/v1/uploads/:filename - Serve uploaded files with safe Content-Type headers
export async function GET(_req: NextRequest, { params }: { params: Promise<Record<string, string>> }) {
  const { filename: rawFilename } = await params;

  // Prevent directory traversal by stripping path components
  const filename = path.basename(rawFilename);
  const uploadsDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
  const filePath = path.join(uploadsDir, filename);

  // Check file exists
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const contentType = getSafeContentType(filename);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    },
  });
}
