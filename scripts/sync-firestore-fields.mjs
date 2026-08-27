/**
 * ============================================================================
 * RAHA PREMIUM — Sync & Align Firestore Movie & Series Fields
 * ============================================================================
 * 
 * Ensures all documents in Firestore have both snake_case and camelCase field aliases
 * so that both existing and new queries (e.g. is_active / isActive, created_at / createdAt)
 * return full results across the site.
 * ============================================================================
 */

const FIREBASE_PROJECT_ID = 'rahacrone';
const FIREBASE_API_KEY = 'AIzaSyAF4ppez6gkiZYNwBn-LMh97NeeYkZ6aQY';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function syncCollection(collectionName) {
  console.log(`\n🔄 Starting sync for collection "${collectionName}"...`);
  
  let pageToken = null;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  do {
    let url = `${FIRESTORE_BASE}/${collectionName}?pageSize=300`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    let data;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Failed to fetch page of ${collectionName}: ${res.status}`);
        break;
      }
      data = await res.json();
    } catch (e) {
      console.error(`Network error fetching ${collectionName}:`, e.message);
      break;
    }

    const docs = data.documents || [];
    if (docs.length === 0) break;

    // Filter docs that need updating
    const docsToUpdate = [];
    for (const doc of docs) {
      totalProcessed++;
      const f = doc.fields || {};

      // Check if missing critical snake_case fields
      const needsUpdate = !f.created_at || !f.is_active || !f.video_url || !f.thumbnail_url || (f.is_adult === undefined);

      if (needsUpdate) {
        docsToUpdate.push(doc);
      } else {
        totalSkipped++;
      }
    }

    // Process updates concurrently in chunks of 25
    const CONCURRENCY = 25;
    for (let i = 0; i < docsToUpdate.length; i += CONCURRENCY) {
      const chunk = docsToUpdate.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(async (doc) => {
        try {
          const f = doc.fields || {};
          const docPath = doc.name; // projects/.../databases/.../documents/...

          const patchFields = {
            is_active: f.is_active || (f.isActive ? { booleanValue: f.isActive.booleanValue } : { booleanValue: true }),
            is_adult: f.is_adult || (f.isAdult ? { booleanValue: f.isAdult.booleanValue } : { booleanValue: false }),
            created_at: f.created_at || f.createdAt || { timestampValue: doc.createTime || new Date().toISOString() },
            updated_at: f.updated_at || f.updatedAt || { timestampValue: doc.updateTime || new Date().toISOString() },
            video_url: f.video_url || f.videoLink || { stringValue: '' },
            thumbnail_url: f.thumbnail_url || f.thumbnailUrl || { stringValue: '' },
          };

          if (f.adult_category || f.adultCategory) {
            patchFields.adult_category = f.adult_category || f.adultCategory;
          }

          const updateMask = Object.keys(patchFields).map(k => `updateMask.fieldPaths=${k}`).join('&');
          const patchUrl = `https://firestore.googleapis.com/v1/${docPath}?key=${FIREBASE_API_KEY}&${updateMask}`;

          const patchRes = await fetch(patchUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: patchFields })
          });

          if (patchRes.ok) {
            totalUpdated++;
          } else {
            totalFailed++;
          }
        } catch (err) {
          totalFailed++;
        }
      }));
    }

    console.log(`   📊 Processed: ${totalProcessed} | Updated: ${totalUpdated} | Already synced: ${totalSkipped} | Failed: ${totalFailed}`);

    pageToken = data.nextPageToken;
  } while (pageToken);

  console.log(`\n✅ Finished sync for "${collectionName}":`);
  console.log(`   Total scanned: ${totalProcessed}`);
  console.log(`   Total updated: ${totalUpdated}`);
  console.log(`   Total already synced: ${totalSkipped}`);
  console.log(`   Total failed: ${totalFailed}\n`);
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║  RAHA PREMIUM — Field Synchronization Script                       ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  await syncCollection('movies');
  await syncCollection('series');

  console.log('🎉 Database synchronization complete!');
}

main().catch(console.error);
