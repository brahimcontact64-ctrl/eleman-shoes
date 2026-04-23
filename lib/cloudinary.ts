const hasFlag = (url: string, flag: string): boolean => {
  return new RegExp(`(?:^|[,/])${flag}(?:,|/|$)`).test(url);
};

export const getOptimizedImage = (url: string, width = 400): string => {
  if (!url) return "";

  const cloudName = "devq3prkj"; 

  let transforms = "f_auto,q_auto";

  if (!hasFlag(url, "w_")) {
    transforms += `,w_${width}`;
  }

  return `https://res.cloudinary.com/${cloudName}/image/fetch/${transforms}/${encodeURIComponent(url)}`;
};