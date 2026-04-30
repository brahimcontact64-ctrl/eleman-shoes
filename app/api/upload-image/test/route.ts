import { getCloudinaryEnvStatus } from '@/lib/uploadImage';

export const runtime = 'nodejs';

export async function GET() {
  const envStatus = getCloudinaryEnvStatus();

  return Response.json({
    status: 'ok',
    env: envStatus.env,
  });
}
