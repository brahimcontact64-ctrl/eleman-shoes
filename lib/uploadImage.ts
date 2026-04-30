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

let isCloudinaryConfigured = false;

const ensureCloudinaryConfig = () => {
  if (isCloudinaryConfigured) {
    return;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary environment variables are missing.');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  isCloudinaryConfigured = true;
};

const shouldCompressImage = (size: number, width?: number) => {
  return size > MAX_IMAGE_BYTES || (typeof width === 'number' && width > MAX_IMAGE_WIDTH);
};

const maybeCompressImage = async (inputBuffer: Buffer, sourceSize: number): Promise<Buffer> => {
  const image = sharp(inputBuffer, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();

  if (!shouldCompressImage(sourceSize, metadata.width)) {
    return inputBuffer;
  }

  return image
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
};

const uploadBufferToCloudinary = (buffer: Buffer): Promise<string> => {
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

    uploadStream.end(buffer);
  });
};

export async function uploadImage(file: File): Promise<string> {
  if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    throw new Error('Invalid image format. Allowed: jpg, png, webp.');
  }

  ensureCloudinaryConfig();

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  if (!inputBuffer.byteLength) {
    throw new Error('Empty image file received.');
  }

  const processedBuffer = await maybeCompressImage(inputBuffer, file.size);

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
    try {
      return await uploadBufferToCloudinary(processedBuffer);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Image upload failed after retries.');
}
