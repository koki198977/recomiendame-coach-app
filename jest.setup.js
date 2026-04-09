// Suppress act() warnings from async state updates in tests
const originalError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('not wrapped in act')
  ) {
    return;
  }
  originalError(...args);
};

// Mock __ExpoImportMetaRegistry to prevent expo winter runtime issues in tests
Object.defineProperty(global, '__ExpoImportMetaRegistry', {
  get: () => ({ url: null }),
  configurable: true,
});
