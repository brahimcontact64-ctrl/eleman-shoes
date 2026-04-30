const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'devq3prkj';

const hasFlag = (url: string, flag: string): boolean => {
  return new RegExp(`(?:^|[,/])${flag}(?:,|/|$)`).test(url);
};

const appendCloudinaryTransforms = (url: string, width?: number): string => {
  const marker = '/image/upload/';
  const markerIndex = url.indexOf(marker);

  if (markerIndex === -1) {
    return url;
  }

  const before = url.slice(0, markerIndex + marker.length);
  const after = url.slice(markerIndex + marker.length);
  const afterParts = after.split('/').filter(Boolean);

  if (afterParts.length === 0) {
    return url;
  }

  const firstPart = afterParts[0] || '';
  const hasTransformationSegment = !firstPart.startsWith('v') && !firstPart.includes('.');
  const existingTransform = hasTransformationSegment ? (afterParts.shift() || '') : '';

  const transforms = existingTransform
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!transforms.some((item) => item.startsWith('f_'))) {
    transforms.push('f_auto');
  }

  if (!transforms.some((item) => item.startsWith('q_'))) {
    transforms.push('q_auto');
  }

  if (width && width > 0 && !transforms.some((item) => item.startsWith('w_'))) {
    transforms.push(`w_${Math.max(80, Math.round(width))}`);
  }

  return `${before}${transforms.join(',')}/${afterParts.join('/')}`;
};

export const getOptimizedImage = (url: string, width = 400): string => {
  if (!url) return '';

  // Local public assets cannot be fetched by Cloudinary — return as-is
  if (url.startsWith('/')) {
    return url;
  }

  if (url.includes('res.cloudinary.com')) {
    return appendCloudinaryTransforms(url, width);
  }

  const safeWidth = Math.max(80, Math.round(width || 400));
  let transforms = 'f_auto,q_auto';

  if (!hasFlag(url, 'w_')) {
    transforms += `,w_${safeWidth}`;
  }

  const optimized = `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transforms}/${encodeURIComponent(url)}`;

  if (process.env.NODE_ENV === 'development') {
    console.log('[Cloudinary] source:', url, '->', optimized);
  }

  return optimized;
};