import { NextResponse } from 'next/server';

import { uploadImage } from '@/lib/uploadImage';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required.' }, { status: 400 });
    }

    const secureUrl = await uploadImage(file);

    return NextResponse.json({ secure_url: secureUrl });
  } catch (error) {
    console.error('Upload image error:', error);

    const message = error instanceof Error ? error.message : 'Image upload failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
