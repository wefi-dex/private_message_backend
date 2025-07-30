// Test script to verify configuration
require('dotenv').config();

console.log('🔧 Testing Backend Configuration...\n');

// Test environment variables
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'SECRET_KEY',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_DATABASE_URL'
];

console.log('📋 Environment Variables:');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${varName.includes('KEY') || varName.includes('PASSWORD') ? '***SET***' : value}`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
  }
});

console.log('\n🔍 Configuration Status:');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Port: ${process.env.PORT || 8000}`);
console.log(`Firebase Project: ${process.env.FIREBASE_PROJECT_ID || 'NOT SET'}`);
console.log(`Database URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);

console.log('\n📝 Next Steps:');
console.log('1. Install Firebase Admin SDK: npm install firebase-admin');
console.log('2. Update DATABASE_URL with your PostgreSQL credentials');
console.log('3. Generate a secure JWT secret');
console.log('4. Run: npm run dev');

console.log('\n✨ Configuration test complete!'); 