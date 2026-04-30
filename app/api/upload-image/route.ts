import { uploadImage } from '@/lib/uploadImage';

export const runtime = 'nodejs';
export const maxDuration = 60;

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Image upload failed.';
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return Response.json({ success: false, error: 'File is required.' }, { status: 400 });
    }

    console.log('Incoming file:', file.name, file.size);

    const secureUrl = await uploadImage(file);

    return Response.json({ success: true, secure_url: secureUrl });
  } catch (error) {
    console.error('UPLOAD ERROR:', error);

    return Response.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
