"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const app_1 = require("firebase-admin/app");
const database_1 = require("firebase-admin/database");
const config_1 = require("../config");
// Initialize Firebase Admin SDK
const serviceAccount = {
    type: config_1.config.firebase.type,
    project_id: config_1.config.firebase.projectId,
    private_key_id: config_1.config.firebase.privateKeyId,
    private_key: (_a = config_1.config.firebase.privateKey) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, '\n'),
    client_email: config_1.config.firebase.clientEmail,
    client_id: config_1.config.firebase.clientId,
    auth_uri: config_1.config.firebase.authUri,
    token_uri: config_1.config.firebase.tokenUri,
    auth_provider_x509_cert_url: config_1.config.firebase.authProviderX509CertUrl,
    client_x509_cert_url: config_1.config.firebase.clientX509CertUrl,
};
// Initialize the app
const app = (0, app_1.initializeApp)({
    credential: (0, app_1.cert)(serviceAccount),
    databaseURL: config_1.config.firebase.databaseURL
});
const db = (0, database_1.getDatabase)(app);
exports.db = db;
