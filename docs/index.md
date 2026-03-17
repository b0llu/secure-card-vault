# Privacy Policy — Card Vault

**Effective Date:** March 14, 2026
**Last Updated:** March 17, 2026
**App Name:** Card Vault
**Platform:** Android (Google Play), iOS (App Store)
**Developer:** Dhruv

---

## Overview

Card Vault is a completely offline, on-device application for securely storing and organising private information. This Privacy Policy explains what data the app handles, how it is stored, and your rights as a user.

**The short version:** Card Vault collects no personal data, transmits nothing to any server, and has no analytics, advertising, or account system of any kind. Everything stays on your device.

---

## 1. Information We Do Not Collect

Card Vault does **not** collect, transmit, store remotely, or share any of the following:

- Any details you store within the app
- Device identifiers (IMEI, advertising ID, etc.)
- Location data
- Contact information
- Usage analytics or crash reports sent to any external server
- IP addresses or network metadata
- Biometric data (fingerprint templates, etc.)
- Any personally identifiable information (PII)

There are no user accounts, no login system, and no registration process. You are never asked to provide your name, email address, or any contact detail.

---

## 2. Information Stored Locally on Your Device

All data that Card Vault handles is stored exclusively on your device and never leaves it. This includes:

| Data | Purpose | Storage |
|------|---------|---------|
| Saved entries (labels, identifiers, expiry, security codes, nicknames) | Core app functionality | Encrypted on-device database |
| App PIN (hashed) | Vault authentication | Encrypted local storage |
| Biometrics preference toggle | Optional unlock method | Local preference store |
| Grouping / display preferences | UI personalisation | Local preference store |
| Encrypted backup files | User-initiated export only | Saved to a location the user chooses |

### Encryption

Every entry is encrypted using **AES-256** before being written to storage. The encryption key is derived from your PIN and stored in your device's **Secure Enclave** (iOS) or **Android Keystore** (Android) — a hardware-backed, sandboxed area that no other app can access and that cannot be extracted from the device.

---

## 3. Camera Permission

Card Vault may request access to your device camera to allow you to scan and capture details instead of typing them manually.

- The camera feed is processed entirely **on-device** using on-device OCR.
- **No image, frame, or video is transmitted anywhere** — not to us, not to any third party.
- No photo is saved to your photo library unless you explicitly save it yourself.
- Camera access is entirely optional. You may decline the permission and add entries manually.

---

## 4. Biometric Permission

Card Vault may request access to fingerprint authentication to provide a faster unlock option.

- Biometric data is handled entirely by the operating system (iOS LocalAuthentication / Android BiometricPrompt).
- Card Vault **never has access to raw biometric data** (fingerprint images, etc.). It only receives a yes/no authentication result from the OS.
- Enabling biometrics is optional. A PIN-only unlock is always available.

---

## 5. Internet Access

Card Vault **does not use the internet**. It requests no network permissions and makes no outbound connections of any kind — not for syncing, not for analytics, not for ads, not for updates. There is no server infrastructure associated with this app.

If your device firewall or network monitor shows any connection from Card Vault, please contact us immediately at the address below as this would indicate a serious unexpected issue.

---

## 6. Backup and Export

Card Vault includes an optional Export feature that lets you create a backup of your vault.

- Backups are encrypted using **AES-256** with a password you set before the file is created.
- The exported `.securevault` file is saved to a location **you choose** on your device (e.g., local storage, a cloud folder you select).
- Card Vault does not upload, send, or have any access to this file after it is created.
- If you choose to store the backup in a cloud service (e.g., Google Drive, iCloud), that is entirely your choice and governed by that service's own privacy policy.

---

## 7. Clipboard

When you copy any stored detail to your clipboard, Card Vault automatically clears the clipboard **after 20 seconds**. This ensures sensitive data does not persist in your clipboard where other apps could potentially read it.

---

## 8. Screenshot and Screen Recording Protection

Card Vault blocks screenshots and screen recordings at the system level on both iOS and Android. This means:

- Screenshots taken while the app is open will be blank or blocked.
- The app preview in the recent apps / app switcher screen is blurred or hidden.

This is a security feature designed to prevent accidental or malicious capture of your stored data.

---

## 9. Auto-Lock

The vault automatically locks itself after **30 seconds** of the app being in the background or inactive. Once locked, all stored data is inaccessible without your PIN or biometrics. This protects your data if you leave your phone unattended.

---

## 10. No Third-Party SDKs or Services

Card Vault does not integrate any third-party SDKs for:

- Analytics (no Firebase Analytics, Mixpanel, Amplitude, etc.)
- Advertising (no AdMob, Meta Audience Network, etc.)
- Crash reporting (no Sentry, Crashlytics, Bugsnag, etc.)
- Remote configuration (no Firebase Remote Config, etc.)
- Social login or identity (no Google Sign-In, Facebook Login, etc.)

The only third-party code present in the app is open-source UI and system libraries (React Native, Expo) that operate entirely on-device and do not collect or transmit data.

---

## 11. Children's Privacy

Card Vault does not collect any personal information from anyone, including children. There is no account system, no data entry beyond entries stored locally, and no communication with any server. The app is not directed at children under 13, but because it collects no data whatsoever, it poses no risk to any age group.

---

## 12. Data Security Summary

| Security Measure | Detail |
|-----------------|--------|
| Encryption algorithm | AES-256 |
| Key storage | Device Secure Enclave / Android Keystore |
| Network access | None |
| Remote storage | None |
| Authentication | PIN + optional biometrics |
| Auto-lock | 30 seconds of inactivity |
| Screenshot protection | Blocked at OS level |
| Clipboard protection | Cleared after 20 seconds |
| Stored detail visibility | Hidden by default, auto-hides after 5 seconds |
| Backup protection | AES-256 encrypted, password-protected |

---

## 13. Your Rights

Because Card Vault stores all data exclusively on your device and we have no access to it:

- **Access:** You can view all stored data at any time within the app.
- **Deletion:** Deleting the app from your device permanently and irreversibly removes all stored data. There is no server-side copy to delete.
- **Portability:** You can export your vault at any time using the Export feature in Settings.
- **Correction:** You can edit or delete individual entries directly in the app.

We have no ability to access, retrieve, modify, or delete your data on your behalf because we have no access to your device or its contents.

---

## 14. No Recovery

Because there are no servers and no accounts, there is no password or PIN recovery mechanism. If you forget your PIN and backup password, your vault data cannot be recovered — by you or by us. Please keep your credentials safe.

---

## 15. Changes to This Policy

If we make material changes to this Privacy Policy, we will update the **Last Updated** date at the top of this page. Continued use of the app after any changes constitutes acceptance of the revised policy. We encourage you to review this page periodically.

---

## 16. Contact

If you have any questions, concerns, or feedback regarding this Privacy Policy or Card Vault's privacy practices, please contact:

**Email:** [samantdhruv@gmail.com]
**GitHub Issues:** [https://github.com/b0llu/secure-card-vault/issues]

---

## Summary

Card Vault is designed from the ground up to be a zero-knowledge, offline-only application. We do not want your data, we cannot access your data, and your data never leaves your device. Everything you store is yours — locked, encrypted, and private.

---

*This privacy policy was last reviewed on March 17, 2026.*
