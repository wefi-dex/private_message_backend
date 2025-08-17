# Backend Setup Guide

## Firebase Configuration Complete ✅

The backend has been updated with your Firebase Admin SDK configuration from the service account JSON file.

### Project Details:
- **Project ID**: `private-message-8d8ca`
- **Database URL**: `https://private-message-8d8ca-default-rtdb.firebaseio.com`
- **Service Account**: `firebase-adminsdk-fbsvc@private-message-8d8ca.iam.gserviceaccount.com`

## Environment Variables

Create a `.env` file in the backend directory with the following content:

```env
NODE_ENV=development
PORT=8000

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/private_message_db

# JWT Secret Key
SECRET_KEY=your-super-secret-jwt-key-change-this-in-production

# Firebase Configuration (from your service account JSON)
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=private-message-8d8ca
FIREBASE_PRIVATE_KEY_ID=ed6e9ccea2427e105000fdea67673e5757adb4c0
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDEPYqHprf1q0B/\nNL/ABHROGVeLBhh1W7VEmZXIDclhTOyc5nqtn2L+WnYPKEaUV++nfH6OKYSsFkS2\nxgWaky/ObZ/vSosJZE/pURxLIn6nak0qKLVCmzYFIXcSoN3wdYYzVULl37m/Y0CT\nxYhm0ojGIDUBs6NS6oi4YHCn9DqKzTrVf+JLOyEzleLrt7Alxl9HAanDawQcidiV\ndefUwMpoCfxJhyj1IbKMYA3VSWSWkkf7RFq5JN4Q7NaoncS4OtlVfokzEpcz+6ZR\nDKHA+Vhx6WIQ9RVI7T8jCRAOrjQhDmPj4OyJvr+to4f3LSQQQO7iwX61Eu4ku/Wm\n5FVg1Lm1AgMBAAECggEADxm5NjUDBNl3rhIuCyWMmZHjpaQDb8xtx2iWGP3OmDkm\nH/CwUfno0S++0+3CeJnHrDitOF1Dg0Z3ZSUZu0pGLHlNDEnNJxzb9VUzeyidXF6W\nr37Qa96rqntnwTw1t9IjUIHoEu5DSdHmXzidBWR/99b0nTvofnHjsWRiZtopQxLj\nJdlhNvNqc67CugdvkLUWrmkaEmVJwBDWJ42U1Y9Rjx0uJ6pIqjeZ+kVFIyBhralz\nT9dwwR3vA1NXPm1BMM5HnCERxYUCIr1Txmkwjk/Mpq3b+xW/y+8KI8q04ZpsDhZP\nd2MVJbjAZX7C1OgFDtEaoprXz4i+Lk6Lf9LYSjlf5QKBgQD2F8NILPuq+Szf3aB0\nKn042oZQkDeKSrPgMVmacdZSu3HmlunFz7Un0Ufw+Et/Tr70iturmwmTii3pOL6e\nc4fyr9MxdoW4f8qRXIeA9YW6W6BqZ/m0GWil3EnSDSMglevei0FG0H5oKxktrvW9\nHkpi4q1voTxqopa6CRBOhuZRVwKBgQDMI/+ORgOxXNEoYHi4fzzLeynZQDqgR8e+\nzjgz2F/tk2C9LJO5uSHO6aG2Mw9rPjmDmUk7MkaI88SIh/WBO72XSHviSnH7md9t\nmfW5HD+9O0QChrr3gyI3KMDvGprhkQE+I/Q+LRk/fH3ZKCQ3ImIXdlU30kY1LYlm\nIzeRbpVp0wKBgCBdUa5tVA/RQ2iRsid06xEOFDoGLXe/iVaDxv/71q78vecQk+AT\nCAUbjfWQAgXVKmHo3Sj9c832j0Er2E3obcmp/AF2T/HKxK5HV/7Ky3KN2FQGJp3b\n9ZpSlVbNqYAAl4umDsisZON4P5B1gRYFJM1KeHrE3rg7d80xofZh4WpzAoGAZpn1\nOOHRu1QmP7/1DO3OdYsKpomUrbhGGY12TACFflfjeFEuUltNNbzRLU0Og907dPwX\nBWyobO7wKZsD9pc7HA0vTrYSAd39oQ2PpiEfnBFshkSHNh2vlb+i8MoTbCnAUSYq\n/REXroP4kKuPQDLE0HwGKs9BwDqJ407x/+Nvr0cCgYEA4BMyqpmXup9rcpdApeRo\nV7BsDN3rVQrg/lLJHYIJ69Xt7RB51Wkoptdi8PeQ25sMNmxh91zs3fcP8OhcGXdR\n06WlA8xz+HP9PfRjw/XI0JmDta3pmAZS/aCRI9dqCm88ypHb7edmJktusz4Wg8RS\n8tG+xAQ6OhB0pEjuCEXB6JA=\n-----END PRIVATE KEY-----\n"
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
```

## Installation Steps

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   npm install firebase-admin
   ```

2. **Update Database URL**:
   Replace `postgresql://username:password@localhost:5432/private_message_db` with your actual PostgreSQL connection string.

3. **Generate JWT Secret**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Replace `your-super-secret-jwt-key-change-this-in-production` with the generated key.

4. **Test the Configuration**:
   ```bash
   npm run dev
   ```

## What's Been Updated

✅ **Centralized Configuration** (`src/config.ts`):
- All environment variables with type safety
- Firebase configuration with your service account details
- Sensible defaults for all settings

✅ **Firebase Integration** (`src/utils/firebase.ts`):
- Updated to use centralized config
- Ready for real-time connection request updates

✅ **Database Configuration** (`src/util/postgre.ts`):
- Updated to use centralized config

✅ **Authentication** (`src/rest/middleware/validAuth.ts`, `src/rest/controller/auth.ts`):
- Updated to use centralized config

## Features Ready

🎯 **Real-time Connection Requests**: Firebase integration is complete for:
- Real-time connection request notifications
- Live status updates for users
- Instant UI updates when requests are accepted/rejected

🎯 **Role-based UI**: Contact page shows different content for:
- **Fans**: Find Creator interface
- **Creators**: Connection Requests Manager

🎯 **Connected Users Only**: Homepage shows only connected users instead of all users

🎯 **Real-time Status**: Online/offline presence updates in real-time

## Next Steps

1. Create the `.env` file with the configuration above
2. Update the database URL with your PostgreSQL credentials
3. Generate and set a secure JWT secret
4. Run `npm run dev` to test the backend
5. The Firebase integration is ready for real-time features!

The backend is now fully configured with your Firebase project and ready for real-time connection request management! 🚀 