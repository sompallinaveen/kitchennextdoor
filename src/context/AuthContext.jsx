import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as authApi from "../api/auth.js";
import { APP_DATA_RESET_EVENT, updateSeller as updateSellerRecord } from "../api/store.js";
import { SANDBOX_MODE_KEY, scopedStorageKey } from "../api/storage.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authApi.getSession());

  useEffect(() => {
    function syncSession() {
      setUser(authApi.getSession());
    }

    function syncStoredSession(event) {
      if (event.key === SANDBOX_MODE_KEY || event.key === scopedStorageKey("knd_session")) {
        syncSession();
      }
    }

    window.addEventListener(APP_DATA_RESET_EVENT, syncSession);
    window.addEventListener("storage", syncStoredSession);
    return () => {
      window.removeEventListener(APP_DATA_RESET_EVENT, syncSession);
      window.removeEventListener("storage", syncStoredSession);
    };
  }, []);

  function signIn(credentials) {
    const signedInUser = authApi.login(credentials);
    setUser(signedInUser);
    return signedInUser;
  }

  function signUp(account) {
    return authApi.register(account);
  }

  function claimInvite(invite) {
    const invitedUser = authApi.claimAdminInvite(invite);
    setUser(invitedUser);
    return invitedUser;
  }

  function signOut() {
    authApi.logout();
    setUser(null);
  }

  function syncSeller(changes) {
    if (user?.role !== "seller") {
      throw new Error("Only seller accounts can update seller details.");
    }
    const updatedUser = updateSellerRecord(user.id, changes);
    setUser(updatedUser);
    return updatedUser;
  }

  function updateSuperAdminPassword(password) {
    if (user?.role !== "superadmin") throw new Error("Only the App Admin can update this password.");
    const updatedUser = authApi.changeSuperAdminPassword(user.id, password);
    setUser((current) => ({ ...current, ...updatedUser }));
    return updatedUser;
  }

  const value = useMemo(
    () => ({
      user,
      login: signIn,
      register: signUp,
      claimAdminInvite: claimInvite,
      logout: signOut,
      updateSeller: syncSeller,
      updateSuperAdminPassword,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
