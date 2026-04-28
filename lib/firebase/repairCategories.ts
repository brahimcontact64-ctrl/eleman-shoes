import { adminDb, FieldValue } from '@/lib/firebase/admin';

type CategoryDoc = {
  id: string;
  data: Record<string, any>;
};

type RepairReport = {
  totalCategoriesScanned: number;
  duplicateGroupsFound: number;
  duplicateDocsRemoved: number;
  productLinksMigrated: number;
  sortOrderConflictsFound: number;
  keptIds: string[];
  deletedIds: string[];
};

function normalizeName(name: string | undefined): string {
  return (name || '').trim().toLowerCase();
}

function normalizeSlug(slug: string | undefined): string {
  return (slug || '').trim().toLowerCase();
}

function toMillis(value: any): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return Number.MAX_SAFE_INTEGER;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function chooseCanonical(docs: CategoryDoc[]): CategoryDoc {
  return docs.slice().sort((a, b) => {
    const aCreated = toMillis(a.data.createdAt);
    const bCreated = toMillis(b.data.createdAt);
    if (aCreated !== bCreated) return aCreated - bCreated;

    const aOrder = typeof a.data.sortOrder === 'number' ? a.data.sortOrder : (a.data.order ?? Number.MAX_SAFE_INTEGER);
    const bOrder = typeof b.data.sortOrder === 'number' ? b.data.sortOrder : (b.data.order ?? Number.MAX_SAFE_INTEGER);
    if (aOrder !== bOrder) return aOrder - bOrder;

    return a.id.localeCompare(b.id);
  })[0];
}

function mergeMissingFields(base: Record<string, any>, duplicate: Record<string, any>): Record<string, any> {
  const merged = { ...base };

  const keysToMerge = ['description', 'coverImage', 'icon'];
  keysToMerge.forEach((key) => {
    const baseValue = merged[key];
    const duplicateValue = duplicate[key];
    if ((!baseValue || `${baseValue}`.trim() === '') && duplicateValue) {
      merged[key] = duplicateValue;
    }
  });

  const boolKeys = ['isFeatured', 'isActive', 'showOnHome'];
  boolKeys.forEach((key) => {
    if (typeof merged[key] !== 'boolean' && typeof duplicate[key] === 'boolean') {
      merged[key] = duplicate[key];
    }
  });

  return merged;
}

function groupDocs(
  docs: CategoryDoc[],
  extractor: (doc: CategoryDoc) => string
): CategoryDoc[][] {
  const grouped = new Map<string, CategoryDoc[]>();
  docs.forEach((doc) => {
    const key = extractor(doc);
    if (!key) return;
    const existing = grouped.get(key) || [];
    existing.push(doc);
    grouped.set(key, existing);
  });

  return Array.from(grouped.values()).filter((group) => group.length > 1);
}

export async function repairCategoriesData(): Promise<RepairReport> {
  const categoriesSnap = await adminDb.collection('categories').get();
  const productsSnap = await adminDb.collection('products').get();

  const categoryDocs: CategoryDoc[] = categoriesSnap.docs.map((doc) => ({
    id: doc.id,
    data: doc.data() || {},
  }));

  const slugDuplicateGroups = groupDocs(
    categoryDocs,
    (doc) => normalizeSlug(doc.data.slug)
  );

  const nameDuplicateGroups = groupDocs(
    categoryDocs,
    (doc) => normalizeName(doc.data.name)
  );

  const idRemap = new Map<string, string>();
  const keptIds: string[] = [];
  const deletedIds: string[] = [];
  const deletedIdSet = new Set<string>();
  const keptIdSet = new Set<string>();
  let duplicateGroupsFound = 0;

  const categoryBatch = adminDb.batch();
  let hasCategoryOps = false;

  const processDuplicateGroup = (group: CategoryDoc[]) => {
    const activeGroup = group.filter((doc) => !deletedIdSet.has(doc.id));
    if (activeGroup.length < 2) return;

    duplicateGroupsFound += 1;

    const canonical = chooseCanonical(activeGroup);
    if (!keptIdSet.has(canonical.id)) {
      keptIdSet.add(canonical.id);
      keptIds.push(canonical.id);
    }

    let mergedCanonicalData = { ...canonical.data };

    activeGroup.forEach((doc) => {
      if (doc.id === canonical.id) return;
      mergedCanonicalData = mergeMissingFields(mergedCanonicalData, doc.data);
      idRemap.set(doc.id, canonical.id);
      if (!deletedIdSet.has(doc.id)) {
        deletedIdSet.add(doc.id);
        deletedIds.push(doc.id);
      }
    });

    categoryBatch.set(
      adminDb.collection('categories').doc(canonical.id),
      {
        ...mergedCanonicalData,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    hasCategoryOps = true;
  };

  slugDuplicateGroups.forEach(processDuplicateGroup);
  nameDuplicateGroups.forEach(processDuplicateGroup);

  let productLinksMigrated = 0;
  const productsBatch = adminDb.batch();
  let hasProductOps = false;
  productsSnap.docs.forEach((doc) => {
    const data = doc.data() || {};
    const categoryId = data.categoryId as string | undefined;
    if (!categoryId) return;

    const remappedId = idRemap.get(categoryId);
    if (!remappedId) return;

    productLinksMigrated += 1;
    productsBatch.update(doc.ref, {
      categoryId: remappedId,
      updatedAt: FieldValue.serverTimestamp(),
    });
    hasProductOps = true;
  });

  const archiveBatch = adminDb.batch();
  let hasArchiveOps = false;
  deletedIds.forEach((deletedId) => {
    const dupDoc = categoryDocs.find((d) => d.id === deletedId);
    if (!dupDoc) return;

    const replacedById = idRemap.get(deletedId) || null;

    archiveBatch.set(adminDb.collection('categories_archive').doc(deletedId), {
      ...dupDoc.data,
      originalId: deletedId,
      replacedById,
      archivedAt: FieldValue.serverTimestamp(),
      reason: 'duplicate-repair',
    });
    archiveBatch.delete(adminDb.collection('categories').doc(deletedId));
    hasArchiveOps = true;
  });

  if (hasCategoryOps) {
    await categoryBatch.commit();
  }
  if (hasProductOps) {
    await productsBatch.commit();
  }
  if (hasArchiveOps) {
    await archiveBatch.commit();
  }

  const refreshedSnap = await adminDb.collection('categories').get();
  const refreshed = refreshedSnap.docs.map((doc) => ({ id: doc.id, data: doc.data() || {} }));

  const slugCount = new Map<string, number>();
  const sorted = refreshed
    .slice()
    .sort((a, b) => {
      const aSort = typeof a.data.sortOrder === 'number' ? a.data.sortOrder : (a.data.order ?? Number.MAX_SAFE_INTEGER);
      const bSort = typeof b.data.sortOrder === 'number' ? b.data.sortOrder : (b.data.order ?? Number.MAX_SAFE_INTEGER);
      if (aSort !== bSort) return aSort - bSort;
      return toMillis(a.data.createdAt) - toMillis(b.data.createdAt);
    });

  let sortOrderConflictsFound = 0;
  const normalizeBatch = adminDb.batch();
  let hasNormalizeOps = false;

  sorted.forEach((entry, index) => {
    const name = entry.data.name || `category-${index + 1}`;
    const baseSlugRaw = slugify(normalizeSlug(entry.data.slug) || normalizeName(name) || `category-${index + 1}`);
    const baseSlug = baseSlugRaw || `category-${index + 1}`;
    const seen = (slugCount.get(baseSlug) || 0) + 1;
    slugCount.set(baseSlug, seen);

    const uniqueSlug = seen === 1 ? baseSlug : `${baseSlug}-${seen}`;
    const currentSort = typeof entry.data.sortOrder === 'number' ? entry.data.sortOrder : entry.data.order;

    if (currentSort !== index || entry.data.slug !== uniqueSlug) {
      if (currentSort !== index) sortOrderConflictsFound += 1;
      normalizeBatch.update(adminDb.collection('categories').doc(entry.id), {
        slug: uniqueSlug,
        sortOrder: index,
        order: index,
        updatedAt: FieldValue.serverTimestamp(),
      });
      hasNormalizeOps = true;
    }
  });

  if (hasNormalizeOps) {
    await normalizeBatch.commit();
  }

  return {
    totalCategoriesScanned: categoryDocs.length,
    duplicateGroupsFound,
    duplicateDocsRemoved: deletedIds.length,
    productLinksMigrated,
    sortOrderConflictsFound,
    keptIds,
    deletedIds,
  };
}
