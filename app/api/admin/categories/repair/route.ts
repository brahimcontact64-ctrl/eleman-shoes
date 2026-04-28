import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

import { adminDb } from '@/lib/firebase/admin';
import { repairCategoriesData } from '@/lib/firebase/repairCategories';

export const dynamic = 'force-dynamic';

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7);
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    const userData = userDoc.data() || {};

    const isAdmin = userData.role === 'admin';
    const canManageProducts = Boolean(userData.permissions?.canManageProducts);

    if (!isAdmin && !canManageProducts) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const report = await repairCategoriesData();

    return NextResponse.json({ ok: true, report });
  } catch (error: any) {
    console.error('repair categories api error', error);
    if (error?.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Repair failed' }, { status: 500 });
  }
}
