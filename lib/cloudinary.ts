const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'devq3prkj'

const hasTransformFlag = (url: string, flag: string): boolean =>
  new RegExp(`(?:^|[,/])${flag}(?:,|/|$)`).test(url)

const hasWidthTransform = (url: string): boolean =>
  /(?:^|[,/])w_\d+(?:,|/|$)/.test(url)

/**
 * Returns a Cloudinary-optimized URL with automatic format/quality and a
 * bounded width to reduce payload size, especially on mobile networks.
 */
export const optimizeImage = (url: string, width = 400): string => {
  if (!url) return ''

  if (url.startsWith('/')) return url

  const safeWidth = Math.max(80, Math.round(width || 400))
  const baseTransform = `f_auto,q_auto,w_${safeWidth}`

  if (url.includes('res.cloudinary.com')) {
    if (url.includes('/image/upload/')) {
      const hasAuto = hasTransformFlag(url, 'f_auto') && hasTransformFlag(url, 'q_auto')
      const hasWidth = hasWidthTransform(url)

      if (hasAuto && hasWidth) return url

      const transform = hasAuto ? `w_${safeWidth}` : baseTransform
      return url.replace('/image/upload/', `/image/upload/${transform}/`)
    }

    if (url.includes('/image/fetch/')) {
      const hasAuto = hasTransformFlag(url, 'f_auto') && hasTransformFlag(url, 'q_auto')
      const hasWidth = hasWidthTransform(url)

      if (hasAuto && hasWidth) return url

      const transform = hasAuto ? `w_${safeWidth}` : baseTransform
      return url.replace('/image/fetch/', `/image/fetch/${transform}/`)
    }

    return url
  }

  if (/^https?:\/\//i.test(url)) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/${baseTransform}/${encodeURIComponent(url)}`
  }

  return url
}
