import imageCompression from 'browser-image-compression';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const resolveMimeType = (file: File) => {
  const normalizedType = file.type.toLowerCase();
  if (normalizedType && normalizedType !== 'application/octet-stream') {
    return normalizedType;
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension) {
    return '';
  }

  return MIME_TYPE_BY_EXTENSION[extension] || '';
};

const getCompressedMimeType = (mimeType: string) => {
  if (mimeType === 'image/webp') {
    return 'image/webp';
  }

  return 'image/jpeg';
};

export const validateImageFile = (file: File) => {
  const mimeType = resolveMimeType(file);

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`${file.name}: invalid image format. Allowed: jpg, jpeg, png, webp.`);
  }

  return mimeType;
};

export async function compressImageClient(file: File): Promise<File> {
  const mimeType = validateImageFile(file);

  const compressedFile = await imageCompression(file, {
    maxWidthOrHeight: 1600,
    maxSizeMB: 1.5,
    useWebWorker: true,
    initialQuality: 0.8,
    fileType: getCompressedMimeType(mimeType),
  });

  return new File([compressedFile], file.name, {
    type: compressedFile.type || getCompressedMimeType(mimeType),
    lastModified: Date.now(),
  });
}