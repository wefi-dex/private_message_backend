import { initializeApp, cert } from 'firebase-admin/app'
import { getDatabase } from 'firebase-admin/database'
import { config } from '../config'

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: config.firebase.type,
  project_id: config.firebase.projectId,
  private_key_id: config.firebase.privateKeyId,
  private_key: config.firebase.privateKey?.replace(/\\n/g, '\n'),
  client_email: config.firebase.clientEmail,
  client_id: config.firebase.clientId,
  auth_uri: config.firebase.authUri,
  token_uri: config.firebase.tokenUri,
  auth_provider_x509_cert_url: config.firebase.authProviderX509CertUrl,
  client_x509_cert_url: config.firebase.clientX509CertUrl,
}

// Initialize the app
const app = initializeApp({
  credential: cert(serviceAccount as any),
  databaseURL: config.firebase.databaseURL,
})

const db = getDatabase(app)

export { db }
