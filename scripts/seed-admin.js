/**
 * Creates an admin user in the database.
 * Run: node scripts/seed-admin.js
 *
 * Reads MONGODB_URI from .env
 * Edit the credentials below before running.
 */

require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Edit these ────────────────────────────────────────────────────────────────
const ADMIN = {
  name:  'Krish',
  email: 'krishkrsquare@gmail.com',
  phone: '+919334500158',
  password: 'Krish123456#',
};
// ─────────────────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema(
  {
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:     { type: String, required: true },
    role:         { type: String, enum: ['painter', 'owner', 'admin'], required: true },
    name:         { type: String, required: true, trim: true },
    phone:        { type: String, required: true, unique: true, trim: true },
    emailVerified:{ type: Boolean, default: false },
    fcmTokens:    { type: [String], default: [] },
    status:       { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    letterhead:   { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  const existing = await User.findOne({ email: ADMIN.email.toLowerCase() });
  if (existing) {
    console.log(`Admin already exists: ${ADMIN.email}`);
    await mongoose.disconnect();
    return;
  }

  const hashed = await bcrypt.hash(ADMIN.password, 10);
  await User.create({
    name:          ADMIN.name,
    email:         ADMIN.email.toLowerCase(),
    phone:         ADMIN.phone,
    password:      hashed,
    role:          'admin',
    status:        'active',
    emailVerified: true,
  });

  console.log('Admin user created:');
  console.log(`  Email:    ${ADMIN.email}`);
  console.log(`  Password: ${ADMIN.password}`);
  console.log(`  Phone:    ${ADMIN.phone}`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
