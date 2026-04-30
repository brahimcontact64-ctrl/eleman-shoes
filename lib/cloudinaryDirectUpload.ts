import { compressImageClient, validateImageFile } from '@/lib/compressImageClient';

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'devq3prkj';
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'eleman_unsigned';

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

  let uploadFile = file;
  try {
    uploadFile = await compressImageClient(file);
  } catch (error) {
    console.warn('Client compression failed, using original file.', error);
  }

  const formData = new FormData();
  formData.append('file', uploadFile);
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
