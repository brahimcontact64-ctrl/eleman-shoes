import 'server-only';

import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';

const MAX_IMAGE_BYTES = 1024 * 1024;
const MAX_IMAGE_WIDTH = 1600;
const MAX_UPLOAD_ATTEMPTS = 3; // initial try + 2 retries

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

let isCloudinaryConfigured = false;

type PreparedUpload = {
  buffer: Buffer;
  usedCompression: boolean;
};

type CloudinaryEnvStatus = {
  env: boolean;
  cloud_name: string;
  hasKey: boolean;
  hasSecret: boolean;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown upload error.';
};

export const getCloudinaryEnvStatus = (): CloudinaryEnvStatus => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  const hasKey = !!process.env.CLOUDINARY_API_KEY;
  const hasSecret = !!process.env.CLOUDINARY_API_SECRET;

  return {
    env: !!cloudName && hasKey && hasSecret,
    cloud_name: cloudName,
    hasKey,
    hasSecret,
  };
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

const ensureCloudinaryConfig = () => {
  if (isCloudinaryConfigured) {
    return;
  }

  const envStatus = getCloudinaryEnvStatus();

  console.log('Cloudinary config:', envStatus);

  if (!envStatus.env) {
    throw new Error('Cloudinary env not configured');
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  console.log('Cloudinary configured for cloud:', envStatus.cloud_name);

  isCloudinaryConfigured = true;
};

const shouldCompressImage = (size: number, width?: number) => {
  return size > MAX_IMAGE_BYTES || (typeof width === 'number' && width > MAX_IMAGE_WIDTH);
};

const compressWithSharp = async (inputBuffer: Buffer, sourceSize: number) => {
  const image = sharp(inputBuffer, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();

  if (!shouldCompressImage(sourceSize, metadata.width)) {
    return {
      buffer: inputBuffer,
      usedCompression: false,
    };
  }

  const compressedBuffer = await image
    .resize({
      width: MAX_IMAGE_WIDTH,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 80,
      mozjpeg: true,
    })
    .toBuffer();

  console.log('Compression succeeded:', {
    originalBytes: sourceSize,
    compressedBytes: compressedBuffer.byteLength,
    width: metadata.width,
    height: metadata.height,
  });

  return {
    buffer: compressedBuffer,
    usedCompression: true,
  };
};

const maybeCompressImage = async (inputBuffer: Buffer, sourceSize: number): Promise<PreparedUpload> => {
  let buffer = inputBuffer;

  try {
    return await compressWithSharp(buffer, sourceSize);
  } catch (error) {
    console.warn('Sharp failed, fallback to original file');
    console.error('SHARP ERROR:', error);
    return {
      buffer,
      usedCompression: false,
    };
  }
};

const uploadBufferToCloudinary = (buffer: Buffer, fileName: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'products',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url) {
          reject(new Error('Cloudinary upload did not return secure_url.'));
          return;
        }

        resolve(result.secure_url);
      }
    );

    uploadStream.on('error', (error) => {
      reject(error);
    });

    console.log('Starting Cloudinary upload:', {
      fileName,
      bytes: buffer.byteLength,
    });

    uploadStream.end(buffer);
  });
};

export async function uploadImage(file: File): Promise<string> {
  const mimeType = resolveMimeType(file);

  console.log('Incoming file:', file.name, file.size, mimeType || 'unknown');

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error('Invalid image format. Allowed: jpg, png, webp.');
  }

  ensureCloudinaryConfig();

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  if (!inputBuffer.byteLength) {
    throw new Error('Empty image file received.');
  }

  const preparedUpload = await maybeCompressImage(inputBuffer, file.size);

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
    try {
      console.log('Upload attempt:', {
        fileName: file.name,
        attempt,
        usedCompression: preparedUpload.usedCompression,
      });

      return await uploadBufferToCloudinary(preparedUpload.buffer, file.name);
    } catch (error) {
      lastError = error;
      console.error('UPLOAD ERROR:', {
        fileName: file.name,
        attempt,
        message: getErrorMessage(error),
      });
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Image upload failed after retries.');
}
