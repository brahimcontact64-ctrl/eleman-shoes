const CLOUD_NAME = "devq3prkj";

const hasFlag = (url: string, flag: string): boolean => {
  return new RegExp(`(?:^|[,/])${flag}(?:,|/|$)`).test(url);
};

export const getOptimizedImage = (url: string, width = 400): string => {
  if (!url) return "";

  // Local public assets cannot be fetched by Cloudinary — return as-is
  if (url.startsWith("/")) {
    return url;
  }

  // Already a Cloudinary URL with transforms — return as-is to avoid nesting
  if (url.includes("res.cloudinary.com")) {
    return url;
  }

  const safeWidth = Math.max(80, Math.round(width || 400));
  let transforms = "f_auto,q_auto";

  if (!hasFlag(url, "w_")) {
    transforms += `,w_${safeWidth}`;
  }

  const optimized = `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transforms}/${encodeURIComponent(url)}`;

  if (process.env.NODE_ENV === "development") {
    console.log("[Cloudinary] source:", url, "→", optimized);
  }

  return optimized;
};