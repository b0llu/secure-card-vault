/**
 * exportService.ts
 *
 * Secure encrypted export/import of the card vault.
 *
 * Export flow:
 *  1. Decrypt all cards from SQLite using the master key.
 *  2. Re-encrypt the full card array using a user-supplied password
 *     via PBKDF2-SHA256 → AES-256-CBC (separate from the master key).
 *  3. Save the encrypted blob as a .securevault JSON file.
 *  4. Share the file via expo-sharing.
 *
 * Import flow:
 *  1. Read the .securevault file.
 *  2. Validate the schema/version.
 *  3. Derive the decryption key from user password + stored salt.
 *  4. Decrypt → parse cards → import into local SQLite.
 *
 * The export key is NEVER the same as the master key. This ensures that
 * even if an export file is leaked the master key is not exposed.
 */

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import CryptoJS from 'crypto-js';
import { getCards } from '../storage/database';
import { deriveKeyFromPassword, generateSalt, generateIV } from '../crypto/encryption';
import { Card, VaultExport, VaultExportResult } from '../types';

export const VAULT_VERSION = '1.0';
export const VAULT_FILE_EXTENSION = '.securevault';

// ─── Export ───────────────────────────────────────────────────────────────────

const PBKDF2_ITERATIONS = 200_000;
const APP_BACKUP_DIRECTORY = 'backups';
const ANDROID_EXPORT_DIRECTORY = 'Card Vault';
const ANDROID_EXPORT_MIME_TYPE = 'application/octet-stream';

function createExportFilename() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `CardVault_Backup_${y}-${m}-${d}_${hh}${mm}${VAULT_FILE_EXTENSION}`;
}

async function buildExportPayload(password: string): Promise<string> {
  if (!password || password.length < 10) {
    throw new Error('Export password must be at least 10 characters.');
  }

  const cards = await getCards();
  if (cards.length === 0) {
    throw new Error('No cards to export.');
  }

  const plaintext = JSON.stringify(cards);

  // 2. Generate random salt + IV for PBKDF2 + AES
  const [saltHex, ivHex] = await Promise.all([generateSalt(), generateIV()]);

  // 3. Derive AES key from password using PBKDF2-SHA256
  const key = deriveKeyFromPassword(password, saltHex, PBKDF2_ITERATIONS);
  const iv = CryptoJS.enc.Hex.parse(ivHex);

  // 4. AES-256-CBC encrypt the plaintext
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // 5. Build export object — store iterations so import can derive the same key
  const exportData: VaultExport = {
    encryptedVault: encrypted.toString(),
    salt: saltHex,
    iv: ivHex,
    version: VAULT_VERSION,
    iterations: PBKDF2_ITERATIONS,
  };

  return JSON.stringify(exportData, null, 2);
}

async function ensureAppBackupDirectory(): Promise<string> {
  if (!FileSystem.documentDirectory) {
    throw new Error('This device does not expose a writable documents directory.');
  }

  const backupDirectory = `${FileSystem.documentDirectory}${APP_BACKUP_DIRECTORY}/`;
  await FileSystem.makeDirectoryAsync(backupDirectory, { intermediates: true });
  return backupDirectory;
}

async function resolveAndroidExportDirectory(
  parentUri: string,
): Promise<{ directoryUri: string; locationDescription: string }> {
  try {
    const directoryUri = await FileSystem.StorageAccessFramework.makeDirectoryAsync(
      parentUri,
      ANDROID_EXPORT_DIRECTORY,
    );
    return {
      directoryUri,
      locationDescription: `Selected folder/${ANDROID_EXPORT_DIRECTORY}`,
    };
  } catch {
    try {
      const entries = await FileSystem.StorageAccessFramework.readDirectoryAsync(parentUri);
      const existingDirectory = entries.find((entry) => {
        const decoded = decodeURIComponent(entry).toLowerCase();
        return decoded.endsWith(`/${ANDROID_EXPORT_DIRECTORY.toLowerCase()}`);
      });

      if (existingDirectory) {
        return {
          directoryUri: existingDirectory,
          locationDescription: `Selected folder/${ANDROID_EXPORT_DIRECTORY}`,
        };
      }
    } catch {
      // Fall back to the selected directory when we cannot inspect its contents.
    }

    return {
      directoryUri: parentUri,
      locationDescription: 'Selected folder',
    };
  }
}

/**
 * Exports all cards as a password-encrypted .securevault file,
 * saved into the app's documents/backups directory.
 *
 * @param password  User-defined export password
 * @returns  The saved file metadata
 */
export async function exportVault(password: string): Promise<VaultExportResult> {
  const payload = await buildExportPayload(password);
  const backupDirectory = await ensureAppBackupDirectory();
  const filename = createExportFilename();
  const filePath = `${backupDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(
    filePath,
    payload,
    { encoding: FileSystem.EncodingType.UTF8 },
  );

  return {
    filePath,
    filename,
    locationDescription:
      Platform.OS === 'ios'
        ? 'Files app/On My iPhone/Card Vault/backups'
        : 'App storage/backups',
  };
}

export async function saveVaultCopyToAndroidDirectory(
  localFilePath: string,
  filename: string,
): Promise<VaultExportResult> {
  if (Platform.OS !== 'android') {
    throw new Error('Public folder export is only available on Android.');
  }

  const payload = await FileSystem.readAsStringAsync(localFilePath, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const downloadsUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot(
    'Download',
  );
  const permission =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
      downloadsUri,
    );

  if (!permission.granted) {
    throw new Error('Folder access was not granted.');
  }

  const { directoryUri, locationDescription } =
    await resolveAndroidExportDirectory(permission.directoryUri);

  const safFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
    directoryUri,
    filename,
    ANDROID_EXPORT_MIME_TYPE,
  );

  await FileSystem.StorageAccessFramework.writeAsStringAsync(
    safFileUri,
    payload,
    { encoding: FileSystem.EncodingType.UTF8 },
  );

  return {
    filePath: safFileUri,
    filename,
    locationDescription,
  };
}

// ─── Import ───────────────────────────────────────────────────────────────────

/**
 * Reads and decrypts a .securevault backup file.
 *
 * @param fileUri   File URI from expo-document-picker
 * @param password  Password used when exporting
 * @returns  Decrypted array of cards
 */
export async function decryptVaultFile(
  fileUri: string,
  password: string,
): Promise<Card[]> {
  // 1. Read file contents
  let content: string;
  try {
    content = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch {
    throw new Error('Could not read the backup file.');
  }

  // 2. Parse JSON
  let exportData: VaultExport;
  try {
    exportData = JSON.parse(content) as VaultExport;
  } catch {
    throw new Error(
      'Invalid file format. This does not appear to be a Secure Card Vault backup.',
    );
  }

  // 3. Validate schema
  if (
    !exportData.encryptedVault ||
    !exportData.salt ||
    !exportData.iv ||
    !exportData.version
  ) {
    throw new Error(
      'Invalid backup file. Missing required fields. Only files created by Secure Card Vault are supported.',
    );
  }

  if (exportData.version !== VAULT_VERSION) {
    throw new Error(
      `Unsupported backup version: ${exportData.version}. Please update the app.`,
    );
  }

  // 4. Derive key from password — fall back to 10k for exports made before the 200k upgrade
  const iterations = exportData.iterations ?? 10_000;
  const key = deriveKeyFromPassword(password, exportData.salt, iterations);
  const iv = CryptoJS.enc.Hex.parse(exportData.iv);

  // 5. Decrypt
  let plaintext: string;
  try {
    const decryptedWA = CryptoJS.AES.decrypt(
      exportData.encryptedVault,
      key,
      { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 },
    );
    plaintext = decryptedWA.toString(CryptoJS.enc.Utf8);
    if (!plaintext) throw new Error('Empty result');
  } catch {
    throw new Error(
      'Incorrect password or corrupted backup file.',
    );
  }

  // 6. Parse cards array
  let cards: Card[];
  try {
    cards = JSON.parse(plaintext) as Card[];
    if (!Array.isArray(cards)) throw new Error('Not an array');
  } catch {
    throw new Error(
      'Incorrect password or corrupted backup file.',
    );
  }

  return cards;
}
