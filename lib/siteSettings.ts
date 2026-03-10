import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

let cachedSettings: any = null

export async function getSiteSettings() {

  if (cachedSettings) {
    return cachedSettings
  }

  const snap = await getDoc(doc(db, 'site_settings', 'main'))

  if (!snap.exists()) return null

  cachedSettings = snap.data()

  return cachedSettings
}