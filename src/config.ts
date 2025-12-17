import dotenv from 'dotenv'
dotenv.config()

interface IConfig {
  port: number
  isProduction: boolean
  isDevelopment: boolean
  isTestEnvironment: boolean
  database: {
    url: string
  }
  jwt: {
    secret: string
  }
  firebase: {
    type: string
    projectId: string
    privateKeyId: string
    privateKey: string
    clientEmail: string
    clientId: string
    authUri: string
    tokenUri: string
    authProviderX509CertUrl: string
    clientX509CertUrl: string
    databaseURL: string
  }
  upload: {
    dir: string
    maxSize: number
  }
  cors: {
    origin: string
  }
  logging: {
    level: string
  }
}

export const initConfig = (): IConfig => {
  const {
    NODE_ENV,
    PORT,
    DATABASE_URL,
    SECRET_KEY,
    FIREBASE_TYPE,
    FIREBASE_PROJECT_ID,
    FIREBASE_PRIVATE_KEY_ID,
    FIREBASE_PRIVATE_KEY,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_CLIENT_ID,
    FIREBASE_AUTH_URI,
    FIREBASE_TOKEN_URI,
    FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    FIREBASE_CLIENT_X509_CERT_URL,
    FIREBASE_DATABASE_URL,
    UPLOAD_DIR,
    MAX_FILE_SIZE,
    CORS_ORIGIN,
    LOG_LEVEL,
  } = process.env

  const defaultConfig = {
    isProduction: false,
    isDevelopment: false,
    isTestEnvironment: false,
    port: Number(PORT) || 8000,
    database: {
      url: DATABASE_URL || 'postgresql://username:password@localhost:5432/private_message_db',
    },
    jwt: {
      secret: SECRET_KEY || 'your-super-secret-jwt-key-change-this-in-production',
    },
    firebase: {
      type: FIREBASE_TYPE || 'service_account',
      projectId: FIREBASE_PROJECT_ID || 'private-message-8d8ca',
      privateKeyId: FIREBASE_PRIVATE_KEY_ID || 'ed6e9ccea2427e105000fdea67673e5757adb4c0',
      privateKey: FIREBASE_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDEPYqHprf1q0B/\nNL/ABHROGVeLBhh1W7VEmZXIDclhTOyc5nqtn2L+WnYPKEaUV++nfH6OKYSsFkS2\nxgWaky/ObZ/vSosJZE/pURxLIn6nak0qKLVCmzYFIXcSoN3wdYYzVULl37m/Y0CT\nxYhm0ojGIDUBs6NS6oi4YHCn9DqKzTrVf+JLOyEzleLrt7Alxl9HAanDawQcidiV\ndefUwMpoCfxJhyj1IbKMYA3VSWSWkkf7RFq5JN4Q7NaoncS4OtlVfokzEpcz+6ZR\nDKHA+Vhx6WIQ9RVI7T8jCRAOrjQhDmPj4OyJvr+to4f3LSQQQO7iwX61Eu4ku/Wm\n5FVg1Lm1AgMBAAECggEADxm5NjUDBNl3rhIuCyWMmZHjpaQDb8xtx2iWGP3OmDkm\nH/CwUfno0S++0+3CeJnHrDitOF1Dg0Z3ZSUZu0pGLHlNDEnNJxzb9VUzeyidXF6W\nr37Qa96rqntnwTw1t9IjUIHoEu5DSdHmXzidBWR/99b0nTvofnHjsWRiZtopQxLj\nJdlhNvNqc67CugdvkLUWrmkaEmVJwBDWJ42U1Y9Rjx0uJ6pIqjeZ+kVFIyBhralz\nT9dwwR3vA1NXPm1BMM5HnCERxYUCIr1Txmkwjk/Mpq3b+xW/y+8KI8q04ZpsDhZP\nd2MVJbjAZX7C1OgFDtEaoprXz4i+Lk6Lf9LYSjlf5QKBgQD2F8NILPuq+Szf3aB0\nKn042oZQkDeKSrPgMVmacdZSu3HmlunFz7Un0Ufw+Et/Tr70iturmwmTii3pOL6e\nc4fyr9MxdoW4f8qRXIeA9YW6W6BqZ/m0GWil3EnSDSMglevei0FG0H5oKxktrvW9\nHkpi4q1voTxqopa6CRBOhuZRVwKBgQDMI/+ORgOxXNEoYHi4fzzLeynZQDqgR8e+\nzjgz2F/tk2C9LJO5uSHO6aG2Mw9rPjmDmUk7MkaI88SIh/WBO72XSHviSnH7md9t\nmfW5HD+9O0QChrr3gyI3KMDvGprhkQE+I/Q+LRk/fH3ZKCQ3ImIXdlU30kY1LYlm\nIzeRbpVp0wKBgCBdUa5tVA/RQ2iRsid06xEOFDoGLXe/iVaDxv/71q78vecQk+AT\nCAUbjfWQAgXVKmHo3Sj9c832j0Er2E3obcmp/AF2T/HKxK5HV/7Ky3KN2FQGJp3b\n9ZpSlVbNqYAAl4umDsisZON4P5B1gRYFJM1KeHrE3rg7d80xofZh4WpzAoGAZpn1\nOOHRu1QmP7/1DO3OdYsKpomUrbhGGY12TACFflfjeFEuUltNNbzRLU0Og907dPwX\nBWyobO7wKZsD9pc7HA0vTrYSAd39oQ2PpiEfnBFshkSHNh2vlb+i8MoTbCnAUSYq\n/REXroP4kKuPQDLE0HwGKs9BwDqJ407x/+Nvr0cCgYEA4BMyqpmXup9rcpdApeRo\nV7BsDN3rVQrg/lLJHYIJ69Xt7RB51Wkoptdi8PeQ25sMNmxh91zs3fcP8OhcGXdR\n06WlA8xz+HP9PfRjw/XI0JmDta3pmAZS/aCRI9dqCm88ypHb7edmJktusz4Wg8RS\n8tG+xAQ6OhB0pEjuCEXB6JA=\n-----END PRIVATE KEY-----\n',
      clientEmail: FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@private-message-8d8ca.iam.gserviceaccount.com',
      clientId: FIREBASE_CLIENT_ID || '116810549091130478329',
      authUri: FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      tokenUri: FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      authProviderX509CertUrl: FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
      clientX509CertUrl: FIREBASE_CLIENT_X509_CERT_URL || 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40private-message-8d8ca.iam.gserviceaccount.com',
      databaseURL: FIREBASE_DATABASE_URL || 'https://private-message-8d8ca-default-rtdb.firebaseio.com',
    },
    upload: {
      dir: UPLOAD_DIR || 'uploads',
      maxSize: Number(MAX_FILE_SIZE) || 5242880, // 5MB default
    },
    cors: {
      origin: CORS_ORIGIN || 'http://localhost:3000,http://localhost:19006,http://*:3000,http://*:19006',
    },
    logging: {
      level: LOG_LEVEL || 'debug',
    },
  }
  
  switch (NODE_ENV) {
    case 'development':
      return {
        ...defaultConfig,
        isDevelopment: true,
      }
    case 'production':
      return {
        ...defaultConfig,
        isProduction: true,
      }
    case 'test':
      return {
        ...defaultConfig,
        isTestEnvironment: true,
        port: Number(PORT) || 5001,
      }
    default:
      return {
        ...defaultConfig,
        isDevelopment: true,
      }
  }
}

export const config = initConfig()
