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

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-sharing
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-file-system (legacy API used by storyImageGenerator)
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  moveAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-file-system (new API)
jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///cache/',
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  moveAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'file:///cache/story.jpg' }),
  SaveFormat: { JPEG: 'jpeg' },
}));

// Mock @clerk/expo
jest.mock('@clerk/expo', () => ({
  ClerkProvider: ({ children }) => children,
  useSignIn: () => ({
    signIn: {
      create: jest.fn(),
    },
    setActive: jest.fn(),
    isLoaded: true,
  }),
  useSignUp: () => ({
    signUp: {
      create: jest.fn(),
      prepareEmailAddressVerification: jest.fn(),
    },
    setActive: jest.fn(),
    isLoaded: true,
  }),
  useSSO: () => ({
    startSSOFlow: jest.fn(),
  }),
  useAuth: () => ({
    getToken: jest.fn(),
    signOut: jest.fn(),
    isSignedIn: false,
  }),
  useSession: () => ({
    session: null,
    isLoaded: true,
  }),
}));

// Mock @clerk/expo/token-cache
jest.mock('@clerk/expo/token-cache', () => ({
  tokenCache: {
    getToken: jest.fn(),
    saveToken: jest.fn(),
  },
}));
