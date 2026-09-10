import { mkdirSync } from 'fs';
import { unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { CMS_UPLOAD_CEILING_BYTES } from '../common/upload-limits';

export const UPLOAD_TEMP_DIR = join(tmpdir(), 'prizn-uploads');

export function ensureUploadTempDir() {
  mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
  return UPLOAD_TEMP_DIR;
}

export async function unlinkQuietly(path: string | null | undefined) {
  if (!path) return;
  try {
    await unlink(path);
  } catch {
    // already gone
  }
}

export const cmsDiskStorage = diskStorage({
  destination: (_req, _file, cb) => {
    try {
      cb(null, ensureUploadTempDir());
    } catch (error) {
      cb(error as Error, UPLOAD_TEMP_DIR);
    }
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).slice(0, 16);
    cb(null, `${randomUUID()}${ext}`);
  },
});

export const cmsMulterOptions = {
  storage: cmsDiskStorage,
  limits: { fileSize: CMS_UPLOAD_CEILING_BYTES },
};
