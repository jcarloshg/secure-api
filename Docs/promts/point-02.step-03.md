## Key Implementation Points

- **Cryptographic Security:** The "Original Message" contains sensitive PII (emails, SSNs). You must encrypt it using a standard like **AES-256-GCM**. This ensures that even if an unauthorized person gains access to your JSON file, the sensitive data remains unreadable.
- **Separation of Concerns:** You are storing two versions of the same data.
- **Redacted (Plaintext):** Stored for high-speed auditing, analytics, and debugging without needing decryption keys.
- **Original (Encrypted):** Stored only for "break-glass" scenarios where the real data must be recovered.

- **Mock Database Structure:** Using a JSON file is perfect for a mock setup. You should append each entry as an object in an array, ensuring you include a **timestamp** and a unique **ID** for traceability.

### Logical Data Structure

Your JSON entry should look similar to this to meet architectural standards:

| Field                | Storage Format | Purpose                                              |
| -------------------- | -------------- | ---------------------------------------------------- |
| **ID**               | UUID / String  | Unique identifier for the log entry.                 |
| **Timestamp**        | ISO 8601       | Records exactly when the sanitization occurred.      |
| **Redacted Content** | **Plaintext**  | Viewable by admins for general auditing.             |
| **Original Content** | **Ciphertext** | Securely hidden PII (requires a secret key to read). |
| **AI Response**      | Plaintext      | The output from Step 2.                              |

### Expert Security Tip

In a production environment, never store your **Encryption Key** in the same file or even the same server as the JSON log. Use a dedicated **Secret Manager** (like AWS KMS or HashiCorp Vault) to manage the keys used for the `original_message` encryption.
