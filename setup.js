const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 Backend Setup Script\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('📝 Creating .env file...');
  
  // Generate a secure JWT secret
  const jwtSecret = crypto.randomBytes(64).toString('hex');
  
  const envContent = `NODE_ENV=development
PORT=8000

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/private_message_db

# JWT Secret Key
SECRET_KEY=${jwtSecret}

# Firebase Configuration (from your service account JSON)
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=private-message-8d8ca
FIREBASE_PRIVATE_KEY_ID=ed6e9ccea2427e105000fdea67673e5757adb4c0
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDEPYqHprf1q0B/\\nNL/ABHROGVeLBhh1W7VEmZXIDclhTOyc5nqtn2L+WnYPKEaUV++nfH6OKYSsFkS2\\nxgWaky/ObZ/vSosJZE/pURxLIn6nak0qKLVCmzYFIXcSoN3wdYYzVULl37m/Y0CT\\nxYhm0ojGIDUBs6NS6oi4YHCn9DqKzTrVf+JLOyEzleLrt7Alxl9HAanDawQcidiV\\ndefUwMpoCfxJhyj1IbKMYA3VSWSWkkf7RFq5JN4Q7NaoncS4OtlVfokzEpcz+6ZR\\nDKHA+Vhx6WIQ9RVI7T8jCRAOrjQhDmPj4OyJvr+to4f3LSQQQO7iwX61Eu4ku/Wm\\n5FVg1Lm1AgMBAAECggEADxm5NjUDBNl3rhIuCyWMmZHjpaQDb8xtx2iWGP3OmDkm\\nH/CwUfno0S++0+3CeJnHrDitOF1Dg0Z3ZSUZu0pGLHlNDEnNJxzb9VUzeyidXF6W\\nr37Qa96rqntnwTw1t9IjUIHoEu5DSdHmXzidBWR/99b0nTvofnHjsWRiZtopQxLj\\nJdlhNvNqc67CugdvkLUWrmkaEmVJwBDWJ42U1Y9Rjx0uJ6pIqjeZ+kVFIyBhralz\\nT9dwwR3vA1NXPm1BMM5HnCERxYUCIr1Txmkwjk/Mpq3b+xW/y+8KI8q04ZpsDhZP\\nd2MVJbjAZX7C1OgFDtEaoprXz4i+Lk6Lf9LYSjlf5QKBgQD2F8NILPuq+Szf3aB0\\nKn042oZQkDeKSrPgMVmacdZSu3HmlunFz7Un0Ufw+Et/Tr70iturmwmTii3pOL6e\\nc4fyr9MxdoW4f8qRXIeA9YW6W6BqZ/m0GWil3EnSDSMglevei0FG0H5oKxktrvW9\\nHkpi4q1voTxqopa6CRBOhuZRVwKBgQDMI/+ORgOxXNEoYHi4fzzLeynZQDqgR8e+\\nzjgz2F/tk2C9LJO5uSHO6aG2Mw9rPjmDmUk7MkaI88SIh/WBO72XSHviSnH7md9t\\nmfW5HD+9O0QChrr3gyI3KMDvGprhkQE+I/Q+LRk/fH3ZKCQ3ImIXdlU30kY1LYlm\\nIzeRbpVp0wKBgCBdUa5tVA/RQ2iRsid06xEOFDoGLXe/iVaDxv/71q78vecQk+AT\\nCAUbjfWQAgXVKmHo3Sj9c832j0Er2E3obcmp/AF2T/HKxK5HV/7Ky3KN2FQGJp3b\\n9ZpSlVbNqYAAl4umDsisZON4P5B1gRYFJM1KeHrE3rg7d80xofZh4WpzAoGAZpn1\\nOOHRu1QmP7/1DO3OdYsKpomUrbhGGY12TACFflfjeFEuUltNNbzRLU0Og907dPwX\\nBWyobO7wKZsD9pc7HA0vTrYSAd39oQ2PpiEfnBFshkSHNh2vlb+i8MoTbCnAUSYq\\n/REXroP4kKuPQDLE0HwGKs9BwDqJ407x/+Nvr0cCgYEA4BMyqpmXup9rcpdApeRo\\nV7BsDN3rVQrg/lLJHYIJ69Xt7RB51Wkoptdi8PeQ25sMNmxh91zs3fcP8OhcGXdR\\n06WlA8xz+HP9PfRjw/XI0JmDta3pmAZS/aCRI9dqCm88ypHb7edmJktusz4Wg8RS\\n8tG+xAQ6OhB0pEjuCEXB6JA=\\n-----END PRIVATE KEY-----\\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@private-message-8d8ca.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=116810549091130478329
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40private-message-8d8ca.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://private-message-8d8ca-default-rtdb.firebaseio.com

# File Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:19006

# Logging Configuration
LOG_LEVEL=debug
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created successfully!');
  console.log(`🔑 Generated JWT Secret: ${jwtSecret.substring(0, 20)}...`);
} else {
  console.log('✅ .env file already exists');
}

// Check if Firebase Admin SDK is installed
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (!packageJson.dependencies['firebase-admin']) {
  console.log('\n📦 Firebase Admin SDK not installed');
  console.log('Run: npm install firebase-admin');
} else {
  console.log('\n✅ Firebase Admin SDK is installed');
}

console.log('\n📋 Setup Summary:');
console.log('✅ Firebase configuration ready');
console.log('✅ JWT secret generated');
console.log('✅ Environment variables configured');

console.log('\n🔧 Next Steps:');
console.log('1. Update DATABASE_URL in .env with your PostgreSQL credentials');
console.log('2. Install Firebase Admin SDK: npm install firebase-admin');
console.log('3. Test the backend: npm run dev');

console.log('\n🎯 Features Ready:');
console.log('- Real-time connection request notifications');
console.log('- Live user status updates');
console.log('- Role-based contact page (fans vs creators)');
console.log('- Connected users only on homepage');

console.log('\n✨ Setup complete! Your backend is ready for real-time features! 🚀'); 