import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function run() {
  console.log('Starting category repair...');

  const { repairCategoriesData } = await import('../lib/firebase/repairCategories');
  const report = await repairCategoriesData();

  console.log('\n=== Category Repair Report ===');
  console.log(`Total scanned: ${report.totalCategoriesScanned}`);
  console.log(`Duplicate groups found: ${report.duplicateGroupsFound}`);
  console.log(`Duplicate docs removed: ${report.duplicateDocsRemoved}`);
  console.log(`Product links migrated: ${report.productLinksMigrated}`);
  console.log(`Sort-order conflicts fixed: ${report.sortOrderConflictsFound}`);
  console.log(`Kept IDs: ${report.keptIds.length ? report.keptIds.join(', ') : 'none'}`);
  console.log(`Deleted IDs: ${report.deletedIds.length ? report.deletedIds.join(', ') : 'none'}`);
  console.log('==============================\n');
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Category repair failed:', error);
    process.exit(1);
  });
