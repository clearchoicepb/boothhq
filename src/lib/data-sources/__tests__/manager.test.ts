/**
 * Unit tests for DataSourceManager encryption/decryption functionality
 *
 * These tests verify the AES-256-GCM encryption implementation for
 * securing database credentials.
 *
 * Test coverage:
 * - Basic encryption and decryption functionality
 * - Random IV generation (encryption produces different outputs)
 * - Decryption with wrong encryption key
 * - Error handling for invalid inputs
 * - Format validation for encrypted data
 */

import { DataSourceManager } from '../manager';
import crypto from 'crypto';

/**
 * Helper type to access private methods for testing
 * In production, these methods are private for security
 */
type DataSourceManagerWithPrivate = DataSourceManager & {
  decryptKey: (encryptedKey: string) => string;
};

describe('DataSourceManager - Encryption/Decryption', () => {
  let manager: DataSourceManager;
  let originalEncryptionKey: string | undefined;
  const testEncryptionKey = crypto.randomBytes(32).toString('hex');

  beforeAll(() => {
    // Save original encryption key
    originalEncryptionKey = process.env.ENCRYPTION_KEY;

    // Set test encryption key (64 hex characters = 32 bytes for AES-256)
    process.env.ENCRYPTION_KEY = testEncryptionKey;
  });

  beforeEach(() => {
    // Get fresh instance for each test
    manager = DataSourceManager.getInstance();
  });

  afterAll(() => {
    // Restore original encryption key
    if (originalEncryptionKey) {
      process.env.ENCRYPTION_KEY = originalEncryptionKey;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  describe('encryptKey()', () => {
    /**
     * Test 1: Basic encryption functionality
     * Verifies that encryptKey properly encrypts a string
     */
    it('should successfully encrypt a plain text string', () => {
      const plainText = 'my-secret-api-key-12345';
      const encrypted = manager.encryptKey(plainText);

      // Encrypted string should not be empty
      expect(encrypted).toBeTruthy();
      expect(typeof encrypted).toBe('string');

      // Encrypted string should not equal plain text
      expect(encrypted).not.toBe(plainText);

      // Should contain three parts separated by colons (iv:authTag:encrypted)
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);

      // Each part should be valid base64
      parts.forEach(part => {
        expect(part).toMatch(/^[A-Za-z0-9+/]+=*$/);
      });
    });

    /**
     * Test 2: Random IV generation
     * Verifies that encryption produces different output each time due to random IV
     */
    it('should produce different encrypted output each time (random IV)', () => {
      const plainText = 'my-secret-api-key-12345';

      // Encrypt the same text multiple times
      const encrypted1 = manager.encryptKey(plainText);
      const encrypted2 = manager.encryptKey(plainText);
      const encrypted3 = manager.encryptKey(plainText);

      // All encrypted strings should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);
      expect(encrypted2).not.toBe(encrypted3);
      expect(encrypted1).not.toBe(encrypted3);

      // But all should have valid format
      [encrypted1, encrypted2, encrypted3].forEach(encrypted => {
        const parts = encrypted.split(':');
        expect(parts).toHaveLength(3);
      });
    });

    /**
     * Test 3: Error handling - Missing encryption key
     * Verifies proper error when ENCRYPTION_KEY is not set
     */
    it('should throw error when ENCRYPTION_KEY is not set', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => {
        manager.encryptKey('test-key');
      }).toThrow('ENCRYPTION_KEY environment variable is not set');

      // Restore key
      process.env.ENCRYPTION_KEY = originalKey;
    });

    /**
     * Test 4: Error handling - Invalid encryption key length
     * Verifies error when encryption key is not 64 hex characters
     */
    it('should throw error when ENCRYPTION_KEY is wrong length', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'short-key';

      expect(() => {
        manager.encryptKey('test-key');
      }).toThrow('ENCRYPTION_KEY must be 64 hex characters (32 bytes for AES-256)');

      // Restore key
      process.env.ENCRYPTION_KEY = originalKey;
    });

    /**
     * Test 5: Error handling - Empty input
     * Verifies error when trying to encrypt empty string
     */
    it('should throw error when input is empty', () => {
      expect(() => {
        manager.encryptKey('');
      }).toThrow('Invalid input: plainKey must be a non-empty string');
    });

    /**
     * Test 6: Error handling - Invalid input type
     * Verifies error when input is not a string
     */
    it('should throw error when input is not a string', () => {
      expect(() => {
        // @ts-expect-error Testing invalid input type
        manager.encryptKey(null);
      }).toThrow('Invalid input: plainKey must be a non-empty string');

      expect(() => {
        // @ts-expect-error Testing invalid input type
        manager.encryptKey(undefined);
      }).toThrow('Invalid input: plainKey must be a non-empty string');

      expect(() => {
        // @ts-expect-error Testing invalid input type
        manager.encryptKey(123);
      }).toThrow('Invalid input: plainKey must be a non-empty string');
    });

    /**
     * Test 7: Encrypt various string lengths
     * Verifies encryption works with different string lengths
     */
    it('should successfully encrypt strings of various lengths', () => {
      const testStrings = [
        'a', // Single character
        'short-key',
        'medium-length-api-key-with-some-characters',
        'very-long-api-key-'.repeat(10), // Very long string
        'key-with-special-chars-!@#$%^&*()_+-=[]{}|;:,.<>?',
        'key-with-unicode-\u{1F512}\u{1F511}', // Unicode characters
      ];

      testStrings.forEach(str => {
        const encrypted = manager.encryptKey(str);
        expect(encrypted).toBeTruthy();
        expect(encrypted.split(':')).toHaveLength(3);
      });
    });
  });

  describe('decryptKey()', () => {
    /**
     * Helper to access private decryptKey method for testing
     */
    const decryptKey = (encrypted: string): string => {
      return (manager as DataSourceManagerWithPrivate).decryptKey(encrypted);
    };

    /**
     * Test 8: Basic decryption functionality
     * Verifies that decryptKey can decrypt what encryptKey encrypted
     */
    it('should successfully decrypt an encrypted string', () => {
      const plainText = 'my-secret-api-key-12345';

      // Encrypt
      const encrypted = manager.encryptKey(plainText);

      // Decrypt
      const decrypted = decryptKey(encrypted);

      // Should match original
      expect(decrypted).toBe(plainText);
    });

    /**
     * Test 9: Round-trip encryption/decryption
     * Verifies multiple encrypt/decrypt cycles work correctly
     */
    it('should handle multiple round-trip encrypt/decrypt cycles', () => {
      const testStrings = [
        'test-key-1',
        'another-secret-key',
        'key-with-special-chars-!@#$',
        'very-long-key-'.repeat(20),
      ];

      testStrings.forEach(originalText => {
        // Encrypt
        const encrypted = manager.encryptKey(originalText);

        // Decrypt
        const decrypted = decryptKey(encrypted);

        // Verify round-trip
        expect(decrypted).toBe(originalText);
      });
    });

    /**
     * Test 10: Decryption with wrong key
     * Verifies that decryption fails when using a different encryption key
     */
    it('should fail to decrypt when using wrong encryption key', () => {
      const plainText = 'my-secret-api-key';
      const originalKey = process.env.ENCRYPTION_KEY;

      // Encrypt with first key
      const encrypted = manager.encryptKey(plainText);

      // Change to different key
      process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

      // Attempt to decrypt with different key should fail
      expect(() => {
        decryptKey(encrypted);
      }).toThrow();

      // Restore original key
      process.env.ENCRYPTION_KEY = originalKey;
    });

    /**
     * Test 11: Error handling - Invalid format
     * Verifies error when encrypted data has wrong format
     */
    it('should throw error when encrypted data has invalid format', () => {
      // Missing colons
      expect(() => {
        decryptKey('invalid-format-no-colons');
      }).toThrow('Invalid encrypted key format');

      // Too few parts
      expect(() => {
        decryptKey('only:two-parts');
      }).toThrow('Invalid encrypted key format');

      // Too many parts
      expect(() => {
        decryptKey('one:two:three:four');
      }).toThrow('Invalid encrypted key format');
    });

    /**
     * Test 12: Error handling - Empty parts
     * Verifies error when encrypted data has empty components
     */
    it('should throw error when encrypted data has empty parts', () => {
      expect(() => {
        decryptKey('::');
      }).toThrow('Invalid encrypted key format. Missing required components');

      expect(() => {
        decryptKey(':authTag:encrypted');
      }).toThrow('Invalid encrypted key format. Missing required components');

      expect(() => {
        decryptKey('iv::encrypted');
      }).toThrow('Invalid encrypted key format. Missing required components');

      expect(() => {
        decryptKey('iv:authTag:');
      }).toThrow('Invalid encrypted key format. Missing required components');
    });

    /**
     * Test 13: Error handling - Invalid base64
     * Verifies error when encrypted data contains invalid base64
     */
    it('should throw error when encrypted data has invalid base64', () => {
      expect(() => {
        decryptKey('not-base64!:not-base64!:not-base64!');
      }).toThrow();
    });

    /**
     * Test 14: Error handling - Invalid IV length
     * Verifies error when IV is not 16 bytes
     */
    it('should throw error when IV length is invalid', () => {
      // Create valid encrypted data first
      const encrypted = manager.encryptKey('test');
      const parts = encrypted.split(':');

      // Replace IV with wrong length (8 bytes instead of 16)
      const shortIv = Buffer.from('short').toString('base64');
      const invalidEncrypted = `${shortIv}:${parts[1]}:${parts[2]}`;

      expect(() => {
        decryptKey(invalidEncrypted);
      }).toThrow('Invalid IV length');
    });

    /**
     * Test 15: Error handling - Invalid auth tag length
     * Verifies error when authentication tag is not 16 bytes
     */
    it('should throw error when auth tag length is invalid', () => {
      // Create valid encrypted data first
      const encrypted = manager.encryptKey('test');
      const parts = encrypted.split(':');

      // Replace auth tag with wrong length
      const shortAuthTag = Buffer.from('short').toString('base64');
      const invalidEncrypted = `${parts[0]}:${shortAuthTag}:${parts[2]}`;

      expect(() => {
        decryptKey(invalidEncrypted);
      }).toThrow('Invalid auth tag length');
    });

    /**
     * Test 16: Error handling - Tampered data
     * Verifies that authentication fails when data is tampered with
     */
    it('should fail to decrypt when data has been tampered with', () => {
      const plainText = 'my-secret-key';
      const encrypted = manager.encryptKey(plainText);
      const parts = encrypted.split(':');

      // Tamper with the encrypted data (flip a bit)
      const encryptedBuffer = Buffer.from(parts[2], 'base64');
      encryptedBuffer[0] = encryptedBuffer[0] ^ 0xFF; // Flip bits
      const tamperedEncrypted = `${parts[0]}:${parts[1]}:${encryptedBuffer.toString('base64')}`;

      // Decryption should fail due to authentication failure
      expect(() => {
        decryptKey(tamperedEncrypted);
      }).toThrow(/Authentication failed|tampered/i);
    });

    /**
     * Test 17: Error handling - Missing encryption key
     * Verifies error when ENCRYPTION_KEY is not set during decryption
     */
    it('should throw error when ENCRYPTION_KEY is not set', () => {
      const encrypted = manager.encryptKey('test');
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => {
        decryptKey(encrypted);
      }).toThrow('ENCRYPTION_KEY environment variable is not set');

      // Restore key
      process.env.ENCRYPTION_KEY = originalKey;
    });

    /**
     * Test 18: Error handling - Empty input
     * Verifies error when trying to decrypt empty string
     */
    it('should throw error when input is empty', () => {
      expect(() => {
        decryptKey('');
      }).toThrow('Invalid input: encryptedKey must be a non-empty string');
    });

    /**
     * Test 19: Error handling - Invalid input type
     * Verifies error when input is not a string
     */
    it('should throw error when input is not a string', () => {
      expect(() => {
        // @ts-expect-error Testing invalid input type
        decryptKey(null);
      }).toThrow('Invalid input: encryptedKey must be a non-empty string');

      expect(() => {
        // @ts-expect-error Testing invalid input type
        decryptKey(undefined);
      }).toThrow('Invalid input: encryptedKey must be a non-empty string');
    });
  });

  describe('Encryption Format and Structure', () => {
    /**
     * Test 20: Verify encrypted data format structure
     * Ensures the encrypted format follows the expected structure
     */
    it('should produce encrypted data with correct format: iv:authTag:encrypted', () => {
      const plainText = 'test-key';
      const encrypted = manager.encryptKey(plainText);
      const parts = encrypted.split(':');

      expect(parts).toHaveLength(3);

      // Decode each part to verify they're valid base64 and correct sizes
      const iv = Buffer.from(parts[0], 'base64');
      const authTag = Buffer.from(parts[1], 'base64');
      const encryptedData = Buffer.from(parts[2], 'base64');

      // IV should be 16 bytes
      expect(iv.length).toBe(16);

      // Auth tag should be 16 bytes (GCM mode)
      expect(authTag.length).toBe(16);

      // Encrypted data should be at least as long as the plaintext
      expect(encryptedData.length).toBeGreaterThanOrEqual(plainText.length);
    });

    /**
     * Test 21: Verify IV uniqueness
     * Ensures each encryption uses a different IV
     */
    it('should use unique IV for each encryption', () => {
      const plainText = 'test-key';
      const iterations = 10;
      const ivs = new Set<string>();

      // Encrypt multiple times
      for (let i = 0; i < iterations; i++) {
        const encrypted = manager.encryptKey(plainText);
        const iv = encrypted.split(':')[0];
        ivs.add(iv);
      }

      // All IVs should be unique
      expect(ivs.size).toBe(iterations);
    });
  });

  describe('Integration Tests', () => {
    /**
     * Test 22: Real-world scenario - API key encryption
     * Simulates encrypting and storing a Supabase API key
     */
    it('should handle real-world Supabase API key encryption', () => {
      const mockSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiJ9.test';

      // Encrypt the API key
      const encrypted = manager.encryptKey(mockSupabaseKey);

      // Verify it's encrypted
      expect(encrypted).not.toBe(mockSupabaseKey);
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);

      // Decrypt and verify
      const decrypted = (manager as DataSourceManagerWithPrivate).decryptKey(encrypted);
      expect(decrypted).toBe(mockSupabaseKey);
    });

    /**
     * Test 23: Performance test - Encryption speed
     * Ensures encryption is performant
     */
    it('should encrypt and decrypt within reasonable time', () => {
      const plainText = 'my-secret-api-key-12345';
      const iterations = 100;

      const startEncrypt = Date.now();
      for (let i = 0; i < iterations; i++) {
        manager.encryptKey(plainText);
      }
      const encryptTime = Date.now() - startEncrypt;

      // Should complete 100 encryptions in less than 1 second
      expect(encryptTime).toBeLessThan(1000);

      // Test decryption speed
      const encrypted = manager.encryptKey(plainText);
      const startDecrypt = Date.now();
      for (let i = 0; i < iterations; i++) {
        (manager as DataSourceManagerWithPrivate).decryptKey(encrypted);
      }
      const decryptTime = Date.now() - startDecrypt;

      // Should complete 100 decryptions in less than 1 second
      expect(decryptTime).toBeLessThan(1000);
    });
  });
});
