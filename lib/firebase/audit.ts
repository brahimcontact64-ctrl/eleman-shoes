import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { ActorType, AuditAction, TargetType } from '@/lib/types';

interface AuditLogData {
  actorType: ActorType;
  actorId: string;
  actorName: string;
  action: AuditAction;
  targetType: TargetType;
  targetId: string;
  details?: any;
  metadata?: {
    ip?: string;
    userAgent?: string;
  };
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      ...data,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
}

export function getUserAgent(): string {
  if (typeof window !== 'undefined') {
    return window.navigator.userAgent;
  }
  return '';
}
