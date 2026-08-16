import {
  assertAllowedUploadMime,
  assertSafeObjectKey,
  sanitizeStorageFolder,
} from './upload-validation';

describe('upload validation', () => {
  it('sanitizes folder paths', () => {
    expect(sanitizeStorageFolder('../evil', 'uploads')).toBe('evil');
    expect(sanitizeStorageFolder('cms/photos', 'uploads')).toBe('cms/photos');
  });

  it('allows cms media mime types', () => {
    expect(() => assertAllowedUploadMime('image/jpeg', 'cms')).not.toThrow();
    expect(() => assertAllowedUploadMime('application/pdf', 'cms')).toThrow();
  });

  it('rejects unsafe object keys', () => {
    expect(assertSafeObjectKey('uploads/abc.jpg')).toBe('uploads/abc.jpg');
    expect(() => assertSafeObjectKey('../etc/passwd')).toThrow();
  });
});
