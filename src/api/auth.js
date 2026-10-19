import { appStorage as localStorage } from "./storage.js";
import { claimToken, getSocieties, getSociety, validateReferralCode } from "./store.js";

const USERS_KEY = "knd_users";
const SESSION_KEY = "knd_session";
const SUPER_ADMIN_AUTH_KEY = "knd_superadmin_auth";
const SUPER_ADMIN = {
  id: "builtin-superadmin",
  name: "App Admin",
  email: "super@kitchennextdoor.app",
  role: "superadmin",
  status: "approved",
};

function getSuperAdminAuth() {
  const value = localStorage.getItem(SUPER_ADMIN_AUTH_KEY);
  if (!value) return { password: "Admin@123", mustChangePassword: true, lastLoginAt: null };
  const saved = JSON.parse(value);
  if (!saved || typeof saved !== "object" || typeof saved.password !== "string") {
    throw new Error("Saved App Admin credentials are invalid.");
  }
  return { ...saved, mustChangePassword: saved.mustChangePassword !== false };
}

function readUsers() {
  const storedUsers = localStorage.getItem(USERS_KEY);
  const users = storedUsers ? JSON.parse(storedUsers) : [];

  if (!Array.isArray(users)) {
    throw new Error("Saved account data is invalid. Clear the app data and try again.");
  }
  return users;
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getSession() {
  const storedSession = localStorage.getItem(SESSION_KEY);
  if (!storedSession) return null;
  const session = JSON.parse(storedSession);
  if (session.role === "seller" && session.status === "approved") {
    session.status = "verified";
  }
  if (session.role === "app_admin") session.role = "superadmin";
  if (session.role === "superadmin") {
    const adminAuth = getSuperAdminAuth();
    session.mustChangePassword = adminAuth.mustChangePassword;
  }
  const society = session.societyId ? getSociety(session.societyId) : getSocieties().find((item) => item.name === session.society);
  if (society) {
    session.societyId = society.id;
    session.society = society.name;
  }
  return session;
}

export function login({ identifier, password, expectedRole }) {
  // Prototype only: localStorage tokens and plain-text passwords must be replaced with hashing and server-side checks.
  const superAdminAuth = getSuperAdminAuth();
  const accounts = [...readUsers(), { ...SUPER_ADMIN, ...superAdminAuth }];
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const user = accounts.find(
    (account) =>
      (account.email?.toLowerCase() === normalizedIdentifier ||
        account.mobile === identifier.replace(/\D/g, "")) &&
      account.password === password,
  );

  if (!user) {
    throw new Error("We couldn't find an account with those details.");
  }
  if (user.disabled) throw new Error("Your account has been disabled.");
  if (user.role === "admin" && user.status !== "approved") {
    throw new Error(`Your Society Admin account is ${user.status || "not approved"}. Contact the App Admin.`);
  }
  if (expectedRole && user.role !== expectedRole) {
    throw new Error(`This account does not have access to this ${expectedRole === "superadmin" || expectedRole === "app_admin" || expectedRole === "admin" || expectedRole === "society_admin" ? "console" : "account type"}.`);
  }

  const lastLoginAt = Date.now();
  if (user.role === "superadmin") {
    localStorage.setItem(SUPER_ADMIN_AUTH_KEY, JSON.stringify({ ...superAdminAuth, lastLoginAt }));
  } else {
    const users = readUsers();
    const index = users.findIndex((account) => account.id === user.id);
    if (index >= 0) {
      users[index] = { ...users[index], lastLoginAt };
      saveUsers(users);
    }
  }

  const sessionUser = { ...user, lastLoginAt };
  if (sessionUser.role === "seller" && sessionUser.status === "approved") sessionUser.status = "verified";
  const accountSociety = sessionUser.societyId
    ? getSociety(sessionUser.societyId)
    : getSocieties().find((society) => society.name === sessionUser.society);
  if (accountSociety) {
    sessionUser.societyId = accountSociety.id;
    sessionUser.society = accountSociety.name;
  }
  delete sessionUser.password;
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
  return sessionUser;
}

export function claimAdminInvite({ code, name, mobile, email, password }) {
  const admin = claimToken(code, { name, mobile, email, password });
  const session = { ...admin, lastLoginAt: Date.now() };
  const users = readUsers();
  const index = users.findIndex((user) => user.id === admin.id);
  if (index >= 0) {
    users[index] = { ...users[index], lastLoginAt: session.lastLoginAt };
    saveUsers(users);
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function changeSuperAdminPassword(userId, password) {
  if (userId !== SUPER_ADMIN.id) throw new Error("Only the built-in App Admin can change this password.");
  if (String(password).length < 8) throw new Error("Password must be at least 8 characters.");
  const current = getSuperAdminAuth();
  const updated = { ...current, password: String(password), mustChangePassword: false };
  localStorage.setItem(SUPER_ADMIN_AUTH_KEY, JSON.stringify(updated));
  const sessionValue = localStorage.getItem(SESSION_KEY);
  const session = sessionValue ? JSON.parse(sessionValue) : null;
  if (session?.id === SUPER_ADMIN.id) {
    const nextSession = { ...session, mustChangePassword: false };
    delete nextSession.password;
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
  }
  return { ...SUPER_ADMIN, mustChangePassword: false, lastLoginAt: current.lastLoginAt };
}

export function register(account) {
  if (account.role === "seller" && !/^[\w.-]+@[\w.-]+$/.test(account.upiId?.trim() || "")) {
    throw new Error("Seller accounts need a valid UPI ID.");
  }
  const users = readUsers();
  const society = getSociety(account.societyId);
  if (!society) throw new Error("Choose an available society before creating your account.");
  if (society.status === "suspended") throw new Error("This society is currently suspended and cannot accept new accounts.");
  const mobile = account.mobile.replace(/\D/g, "");
  const email = account.email?.trim().toLowerCase() || "";
  const duplicate = users.some(
    (user) => user.mobile === mobile || (email && user.email?.toLowerCase() === email),
  );

  if (duplicate || (email && email === SUPER_ADMIN.email)) {
    throw new Error("An account with that mobile or email already exists.");
  }

  const newAccount = {
    ...account,
    id: crypto.randomUUID(),
    mobile,
    email,
    societyId: society.id,
    society: society.name,
    status: account.role === "seller" && validateReferralCode(society.id, account.referralCode)
      ? "verified"
      : "pending",
    ...(account.role === "seller" ? { online: false } : {}),
  };
  // Prototype only: passwords are stored in plain text until real auth is integrated.
  saveUsers([...users, newAccount]);
  return newAccount;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}
