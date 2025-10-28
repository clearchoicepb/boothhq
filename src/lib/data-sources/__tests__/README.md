# DataSourceManager Tests

This directory contains comprehensive unit tests for the `DataSourceManager` class, specifically focusing on the AES-256-GCM encryption implementation for database credentials.

## Test Coverage

### Encryption Tests (`encryptKey()`)
- ✅ Basic encryption functionality
- ✅ Random IV generation (different outputs each time)
- ✅ Error handling for missing encryption key
- ✅ Error handling for invalid key length
- ✅ Error handling for empty/invalid inputs
- ✅ Encryption of various string lengths
- ✅ Special characters and Unicode support

### Decryption Tests (`decryptKey()`)
- ✅ Basic decryption functionality
- ✅ Round-trip encryption/decryption
- ✅ Decryption failure with wrong key
- ✅ Invalid format detection
- ✅ Empty parts validation
- ✅ Invalid base64 handling
- ✅ Invalid IV length detection
- ✅ Invalid auth tag length detection
- ✅ Tampered data detection
- ✅ Error handling for missing encryption key
- ✅ Error handling for empty/invalid inputs

### Format and Structure Tests
- ✅ Verify encrypted data format (iv:authTag:encrypted)
- ✅ Verify component sizes (IV: 16 bytes, AuthTag: 16 bytes)
- ✅ Verify IV uniqueness across encryptions

### Integration Tests
- ✅ Real-world API key encryption scenario
- ✅ Performance benchmarks

## Running the Tests

### Prerequisites

First, install the required testing dependencies:

```bash
npm install --save-dev jest ts-jest @types/jest
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Run Only Encryption Tests

```bash
npm test -- manager.test.ts
```

### Run Specific Test Suite

```bash
npm test -- --testNamePattern="encryptKey"
```

## Test Setup

The tests use a dynamically generated encryption key for testing purposes. Each test suite:

1. **Setup** - Generates a test encryption key and saves the original
2. **Execution** - Runs tests with the test key
3. **Teardown** - Restores the original encryption key

## Environment Variables

The tests require the `ENCRYPTION_KEY` environment variable:

- **Format**: 64 hexadecimal characters (32 bytes)
- **Generation**: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- **Test Setup**: Automatically generated in `jest.setup.js`

## Key Test Scenarios

### 1. Basic Encryption/Decryption Flow
```typescript
const plainText = 'my-secret-api-key';
const encrypted = manager.encryptKey(plainText);
const decrypted = decryptKey(encrypted);
expect(decrypted).toBe(plainText);
```

### 2. Random IV Verification
```typescript
const encrypted1 = manager.encryptKey('same-text');
const encrypted2 = manager.encryptKey('same-text');
expect(encrypted1).not.toBe(encrypted2); // Different due to random IV
```

### 3. Tamper Detection
```typescript
// Modify encrypted data
const tampered = modifyEncryptedData(encrypted);
expect(() => decryptKey(tampered)).toThrow(/Authentication failed/);
```

## Test Structure

Each test follows this pattern:

1. **Arrange** - Set up test data and prerequisites
2. **Act** - Execute the function being tested
3. **Assert** - Verify the results match expectations

Tests are well-documented with:
- Clear test descriptions
- Detailed comments explaining what's being tested
- Expected behaviors and edge cases

## Continuous Integration

These tests are designed to run in CI/CD pipelines. Ensure your CI environment has:

- Node.js 18+ installed
- All dependencies installed (`npm ci`)
- The `ENCRYPTION_KEY` environment variable set (or let `jest.setup.js` generate one)

## Troubleshooting

### Test Fails: "ENCRYPTION_KEY environment variable is not set"
- Ensure `jest.setup.js` is being loaded
- Check that the setup file is creating the encryption key

### Test Fails: Authentication errors
- Verify the same encryption key is used for encrypt and decrypt
- Check that test isolation is working (beforeEach/afterEach)

### TypeScript Errors
- Ensure `ts-jest` is installed
- Verify `tsconfig.json` includes test files
- Check that type definitions for Jest are installed (`@types/jest`)

## Contributing

When adding new encryption-related features:

1. Write tests first (TDD approach)
2. Ensure tests cover happy path and error cases
3. Document the security implications
4. Verify tests pass before committing

## Security Notes

- Tests use randomly generated keys (safe for testing)
- Never commit real encryption keys to the repository
- Production keys should be stored in secure secret management systems
- These tests verify cryptographic implementations - do not modify without security review

## References

- [AES-GCM Encryption](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing TypeScript](https://jestjs.io/docs/getting-started#via-ts-jest)
