import { compressImageClient, validateImageFile } from '@/lib/compressImageClient';

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const isDirectUploadConfigured = () => !!cloudName && !!uploadPreset;

const getCloudinaryErrorMessage = (payload: any, fileName: string) => {
  const message =
    payload?.error?.message ||
    payload?.message ||
    payload?.error ||
    'Cloudinary direct upload failed.';

  return `${fileName}: ${message}`;
};

export async function uploadImageDirect(file: File): Promise<string> {
  validateImageFile(file);

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary direct upload env is not configured on the client.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', 'products');

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getCloudinaryErrorMessage(payload, file.name));
  }

  if (!payload?.secure_url) {
    throw new Error(`${file.name}: Cloudinary direct upload succeeded without secure_url.`);
  }

  return payload.secure_url;
}

const uploadImageViaServer = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload-image', {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload?.error ? `${file.name}: ${payload.error}` : `${file.name}: fallback upload failed.`
    );
  }

  if (!payload?.secure_url) {
    throw new Error(`${file.name}: fallback upload succeeded without secure_url.`);
  }

  return payload.secure_url;
};

export async function uploadProductImage(file: File): Promise<string> {
  validateImageFile(file);

  let uploadFile = file;
  try {
    uploadFile = await compressImageClient(file);
  } catch (error) {
    console.warn('Client compression failed, using original file.', error);
  }

  if (isDirectUploadConfigured()) {
    return uploadImageDirect(uploadFile);
  }

  return uploadImageViaServer(uploadFile);
}