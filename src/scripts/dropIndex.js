import mongoose from 'mongoose';
import Group from '../models/Group.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/yourdb';

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if the collection exists
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log(
      'Collections in DB:',
      collections.map((c) => c.name)
    );

    // List current indexes
    const indexes = await Group.collection.indexes();
    console.log('Current indexes:', indexes);

    const oldIndexName =
      'schoolId_1_courseCode_1_level_1_department_1_createdBy_1';

    if (indexes.some((i) => i.name === oldIndexName)) {
      await Group.collection.dropIndex(oldIndexName);
      console.log(`✅ Dropped old index: ${oldIndexName}`);
    } else {
      console.log(`ℹ️ Old index not found: ${oldIndexName}`);
    }

    // Ensure schema indexes are up to date
    await Group.syncIndexes();
    console.log('✅ Synced new indexes from schema');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
})();
