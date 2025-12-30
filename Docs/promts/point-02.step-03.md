## info

◦ Step 3 (Audit Log): Write the original message (encrypted) and the redacted message (plaintext) to a mock database (a JSON file is fine).

## Key Implementation Points

- **Cryptographic Security:** The "Original Message" contains sensitive PII (emails, SSNs). You must encrypt it using a standard like **AES-256-GCM**. This ensures that even if an unauthorized person gains access to your JSON file, the sensitive data remains unreadable.
- **Separation of Concerns:** You are storing two versions of the same data.
- **Redacted (Plaintext):** Stored for high-speed auditing, analytics, and debugging without needing decryption keys.
- **Original (Encrypted):** Stored only for "break-glass" scenarios where the real data must be recovered.

### Logical Data Structure

Your JSON entry should look similar to this to meet architectural standards:

| Field                | Storage Format | Purpose                                              |
| -------------------- | -------------- | ---------------------------------------------------- |
| **ID**               | UUID / String  | Unique identifier for the log entry.                 |
| **Timestamp**        | ISO 8601       | Records exactly when the sanitization occurred.      |
| **Redacted Content** | **Plaintext**  | Viewable by admins for general auditing.             |
| **Original Content** | **Ciphertext** | Securely hidden PII (requires a secret key to read). |
| **AI Response**      | Plaintext      | The output from Step 2.                              |

<!-- ### Expert Security Tip

In a production environment, never store your **Encryption Key** in the same file or even the same server as the JSON log. Use a dedicated **Secret Manager** (like AWS KMS or HashiCorp Vault) to manage the keys used for the `original_message` encryption. -->

## Prompt 01

1. I want to save the information that the user send trought the body
2. I want to save two versions:
   - Original Content:
     - contains sensitive PII (emails, SSNs). You must encrypt it using a standard like **AES-256-GCM**.
   - Redacted Content:
     - Stored for high-speed auditing, analytics, and debugging without needing decryption keys
     - the result of the middleware: src/presentation/middlewares/redactSensitiveData.ts
3. add the logic into the file: 
    - create the logic into: src/application/secure-inquiry/infraestructure/persist-file/persist-file.db.ts
    - use this file as data base: src/application/secure-inquiry/infraestructure/persist-file/db.json
4. I want to save the next strcuture:
    - uuid: Unique identifier for the log entry.                 
    - timestamp: Records exactly when the sanitization occurred.      
    - redacted-content: Viewable by admins for general auditing.             
    - original-content: Securely hidden PII (requires a secret key to read). 
4. add the implementation into the middleware: src/presentation/middlewares/redactSensitiveData.ts