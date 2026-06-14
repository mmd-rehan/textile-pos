import * as path from 'path';

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

export const MIME_EXTENSION_MAP: Record<AllowedMime, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

export const ATTACHMENT_STORAGE_DIR = path.resolve(
  process.cwd(),
  'storage',
  'purchase-attachments',
);
