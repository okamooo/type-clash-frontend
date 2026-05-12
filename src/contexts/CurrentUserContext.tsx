"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type CurrentUser = Readonly<{
  id: number;
  name: string;
  email: string;
  iconImage: string | null;
  backgroundImage: number;
}>;

type CurrentUserContextValue = Readonly<{
  currentUser: CurrentUser;
  updateCurrentUser: (updates: Partial<CurrentUser>) => void;
}>;

const mockCurrentUser: CurrentUser = {
  id: 1,
  name: "Guest",
  email: "guest@example.com",
  iconImage: null,
  backgroundImage: 0,
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  // API接続時は認証中の userId で GET /api/users/:userId し、この初期値を置き換える。
  const [currentUser, setCurrentUser] = useState<CurrentUser>(mockCurrentUser);

  const updateCurrentUser = useCallback((updates: Partial<CurrentUser>) => {
    setCurrentUser((user) => ({
      ...user,
      ...updates,
    }));
  }, []);

  const contextValue = useMemo(
    () => ({ currentUser, updateCurrentUser }),
    [currentUser, updateCurrentUser],
  );

  return (
    <CurrentUserContext.Provider value={contextValue}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);

  if (!context) {
    throw new Error("useCurrentUser must be used within CurrentUserProvider");
  }

  return context;
}
