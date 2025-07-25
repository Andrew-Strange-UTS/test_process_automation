// server/secrets.js
const fs = require('fs');
const { encrypt, decrypt } = require('./utils/encryption');
const SECRETS_FILE = __dirname + '/user-secrets.json.enc';
let secrets = {};
try {
  if (fs.existsSync(SECRETS_FILE)) secrets = decrypt(fs.readFileSync(SECRETS_FILE, 'utf-8'));
} catch { secrets = {}; }

function saveSecrets() {
  fs.writeFileSync(SECRETS_FILE, encrypt(secrets), { mode: 0o600 });
}

function listNames() { return Object.keys(secrets); }
function setSecret(name, value) { secrets[name] = value; saveSecrets(); }
function deleteSecret(name) { delete secrets[name]; saveSecrets(); }
function getSecret(name) { return secrets[name]; } // Only for backend use

module.exports = { listNames, setSecret, deleteSecret, getSecret };