import { Category } from '@/lib/types';

const EMPTY_SLUG_PREFIX = 'category';

function timestampToMs(value: any): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  return Number.MAX_SAFE_INTEGER;
}

export function normalizeCategoryName(name: string | undefined | null): string {
  return (name || '').trim().toLowerCase();
}

export function normalizeCategorySlug(slug: string | undefined | null): string {
  return (slug || '').trim().toLowerCase();
}

export function ensureCategorySlug(input: Partial<Category>, fallbackIndex: number): string {
  const rawSlug = normalizeCategorySlug(input.slug);
  if (rawSlug) return rawSlug;

  const rawName = normalizeCategoryName(input.name || '');
  if (!rawName) return `${EMPTY_SLUG_PREFIX}-${fallbackIndex + 1}`;

  return rawName
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function categoryDedupKey(input: Partial<Category>, fallbackIndex: number): string {
  const slug = ensureCategorySlug(input, fallbackIndex);
  if (slug) return `slug:${slug}`;
  return `name:${normalizeCategoryName(input.name || '')}`;
}

function pickCanonicalCategory(a: Category, b: Category): Category {
  const aCreated = timestampToMs((a as any).createdAt);
  const bCreated = timestampToMs((b as any).createdAt);

  if (aCreated !== bCreated) {
    return aCreated < bCreated ? a : b;
  }

  const aSort = a.sortOrder ?? a.order ?? Number.MAX_SAFE_INTEGER;
  const bSort = b.sortOrder ?? b.order ?? Number.MAX_SAFE_INTEGER;
  if (aSort !== bSort) {
    return aSort < bSort ? a : b;
  }

  return a.id < b.id ? a : b;
}

export function dedupeCategories(rawCategories: Category[]): Category[] {
  const grouped = new Map<string, Category>();

  rawCategories.forEach((category, index) => {
    const key = categoryDedupKey(category, index);
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, category);
      return;
    }
    grouped.set(key, pickCanonicalCategory(current, category));
  });

  return Array.from(grouped.values()).sort((a, b) => {
    const aOrder = a.sortOrder ?? a.order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.sortOrder ?? b.order ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });
}
