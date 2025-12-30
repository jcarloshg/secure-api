
import { randomUUID, createCipheriv, randomBytes, createDecipheriv } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import * as path from 'path';

export class PersistFileDB {

    private static readonly DB_PATH = path.join(__dirname, 'db.json');
    private static readonly AES_ALGO = 'aes-256-gcm';
    // In production, store this key securely (env var, vault, etc)
    /**
     * The AES encryption key used for cryptographic operations.
     *
     * This key is initialized from the `AES_SECRET_KEY` environment variable if available,
     * otherwise it falls back to a default 32-byte (256-bit) key represented as a 64-character hexadecimal string.
     *
     * The `'hex'` encoding is used because the key is expected to be provided as a hexadecimal string,
     * which is a common format for representing binary data in environment variables and configuration files.
     * Using `'hex'` ensures the string is correctly converted into a `Buffer` of raw bytes required for AES encryption.
     */
    private static readonly AES_KEY = process.env.AES_SECRET_KEY
        ? Buffer.from(process.env.AES_SECRET_KEY, 'hex')
        : Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex'); // 64 hex chars = 32 bytes

    private static encrypt(text: string): { ciphertext: string, iv: string, tag: string } {
        const iv = randomBytes(12); // 12 bytes for GCM
        const cipher = createCipheriv(this.AES_ALGO, this.AES_KEY, iv);
        let encrypted = cipher.update(text, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        const tag = cipher.getAuthTag();
        return {
            ciphertext: encrypted,
            iv: iv.toString('base64'),
            tag: tag.toString('base64'),
        };
    }

    private static decrypt({ ciphertext, iv, tag }: { ciphertext: string, iv: string, tag: string }): string {
        const decipher = createDecipheriv(this.AES_ALGO, this.AES_KEY, Buffer.from(iv, 'base64'));
        decipher.setAuthTag(Buffer.from(tag, 'base64'));
        let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    private static loadDB(): any[] {
        if (!existsSync(this.DB_PATH)) return [];
        const raw = readFileSync(this.DB_PATH, 'utf8');
        if (!raw.trim()) return [];
        try {
            return JSON.parse(raw);
        } catch {
            return [];
        }
    }

    private static saveDB(entries: any[]) {
        writeFileSync(this.DB_PATH, JSON.stringify(entries, null, 2), 'utf8');
    }

    static saveLogEntry({ originalContent, redactedContent }: { originalContent: any, redactedContent: any }) {
        const uuid = randomUUID();
        const timestamp = new Date().toISOString();
        const originalString = JSON.stringify(originalContent);
        const encrypted = this.encrypt(originalString);
        const entry = {
            uuid,
            timestamp,
            'redacted-content': redactedContent,
            'original-content': encrypted,
        };
        const db = this.loadDB();
        db.push(entry);
        this.saveDB(db);
        return uuid;
    }

    static decryptOriginalContent(encrypted: { ciphertext: string, iv: string, tag: string }) {
        return JSON.parse(this.decrypt(encrypted));
    }
}