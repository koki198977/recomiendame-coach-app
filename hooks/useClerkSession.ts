// hooks/useClerkSession.ts
// Feature: clerk-authentication
// Encapsulates Clerk token exchange and sign-out for use in App.tsx and screens

import { useAuth } from '@clerk/expo';
import { AuthService } from '../services/authService';

/**
 * Hook that encapsulates the Clerk session management:
 * - Exchanges a Clerk JWT for a Backend JWT via AuthService
 * - Exposes Clerk's signOut for use in logout flows
 */
export function useClerkSession() {
  const { getToken, signOut } = useAuth();

  /**
   * Exchanges the current Clerk session token for a Backend JWT.
   * Stores the Backend JWT in AsyncStorage via AuthService.
   * @returns The Backend JWT (access_token)
   * @throws Error if no active Clerk session or exchange fails
   */
  const exchangeClerkTokenForBackendToken = async (): Promise<string> => {
    const clerkToken = await getToken();
    if (!clerkToken) {
      throw new Error('No hay sesión activa de Clerk.');
    }
    return AuthService.loginWithClerkToken(clerkToken);
  };

  return {
    exchangeClerkTokenForBackendToken,
    signOut,
  };
}
