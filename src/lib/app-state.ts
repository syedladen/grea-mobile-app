import { createContext, useContext } from 'react';

export type AppSession = {
  token: string | null;
  user: Record<string, unknown> | null;
  isReady: boolean;
  isAuthenticated: boolean;
};

export const AppSessionContext = createContext<AppSession>({
  token: null,
  user: null,
  isReady: false,
  isAuthenticated: false,
});

export function useAppSession() {
  return useContext(AppSessionContext);
}
