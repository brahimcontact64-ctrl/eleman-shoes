/**
 * Cloudinary image optimization helper.
 *
 * If the URL is already a Cloudinary URL, inject f_auto,q_auto and the
 * requested width into the transformation string so Cloudinary serves the
 * lightest possible format (WebP / AVIF) at the right resolution.
 *
 * Firebase Storage URLs and local paths are returned as-is so nothing breaks
 * when images haven't been migrated yet.
 */
export const optimizeImage = (url: string, width = 400): string => {
  if (!url) return ''

  if (url.includes('res.cloudinary.com')) {
    // Avoid double-injecting if transforms are already present
    if (url.includes('f_auto') || url.includes('q_auto')) return url

    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
  }

  // Firebase Storage or anything else: return unchanged
  return url
}
