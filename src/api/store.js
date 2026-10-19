import {
  appStorage as localStorage,
  APP_DATA_RESET_EVENT,
  clearSandboxStorage,
  isSandboxActive,
} from "./storage.js";

const DISHES_KEY = "knd_dishes";
const USERS_KEY = "knd_users";
const REVIEWS_KEY = "knd_reviews";
const ANNOUNCEMENT_KEY = "knd_announcement";
const CART_KEY = "knd_cart";
const POLLS_KEY = "knd_polls";
const ORDERS_KEY = "knd_orders";
const SESSION_KEY = "knd_session";
const COMMISSION_CONFIGS_KEY = "knd_commission_configs";
const SOCIETIES_KEY = "knd_societies";
const ISSUES_KEY = "knd_issues";
const TOKENS_KEY = "knd_admin_tokens";
const SETTINGS_KEY = "knd_app_settings";
const AUDIT_KEY = "knd_audit";
const SUPER_ADMIN_AUTH_KEY = "knd_superadmin_auth";

export const APP_STORAGE_KEYS = Object.freeze([
  DISHES_KEY,
  USERS_KEY,
  REVIEWS_KEY,
  ANNOUNCEMENT_KEY,
  CART_KEY,
  POLLS_KEY,
  ORDERS_KEY,
  SESSION_KEY,
  COMMISSION_CONFIGS_KEY,
  SOCIETIES_KEY,
  ISSUES_KEY,
  TOKENS_KEY,
  SETTINGS_KEY,
  AUDIT_KEY,
  SUPER_ADMIN_AUTH_KEY,
]);

export { APP_DATA_RESET_EVENT };

const RESET_ORDER = [
  CART_KEY,
  ISSUES_KEY,
  REVIEWS_KEY,
  ORDERS_KEY,
  POLLS_KEY,
  ANNOUNCEMENT_KEY,
  DISHES_KEY,
  TOKENS_KEY,
  COMMISSION_CONFIGS_KEY,
  USERS_KEY,
  SOCIETIES_KEY,
  AUDIT_KEY,
  SESSION_KEY,
];

function purgeAppData() {
  RESET_ORDER.forEach((key) => localStorage.removeItem(key));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  window.dispatchEvent(new Event(APP_DATA_RESET_EVENT));
  return { success: true, purgedCollections: [...RESET_ORDER, SETTINGS_KEY], timestamp: Date.now() };
}

function assertActiveActor(actor, role) {
  if (!actor || actor.role !== role || typeof actor.id !== "string") {
    throw new Error(`Only an authenticated ${role === "superadmin" ? "App Admin" : "Society Admin"} can perform this action.`);
  }
  const sessionValue = localStorage.getItem(SESSION_KEY);
  let session;
  try {
    session = sessionValue ? JSON.parse(sessionValue) : null;
  } catch {
    throw new Error("The active session is invalid. Sign in again before performing this action.");
  }
  if (session?.id !== actor.id || session?.role !== role) {
    throw new Error("The active administrator session could not be verified. Sign in again before performing this action.");
  }
}

function assertSocietyAdmin(actor, societyId) {
  assertActiveActor(actor, "admin");
  const society = getSociety(societyId);
  if (!society || society.adminId !== actor.id || actor.societyId !== societyId) {
    throw new Error("Only the assigned Society Admin can manage buyers and chefs in this society.");
  }
}

function assertSuperAdmin(actor) {
  assertActiveActor(actor, "superadmin");
}

export function resetAllProjectData({ actor } = {}) {
  assertSuperAdmin(actor);
  return purgeAppData();
}

export function clearAppData() {
  if (!import.meta.env.DEV || !isSandboxActive()) {
    throw new Error("Only active development sandbox data can be cleared.");
  }
  clearSandboxStorage();
  window.dispatchEvent(new Event(APP_DATA_RESET_EVENT));
  return { cleared: true };
}

export function setDevSuperAdminAuth(password) {
  if (!import.meta.env.DEV || !isSandboxActive()) {
    throw new Error("Development credentials are available only in the active sandbox.");
  }
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("The development App Admin password must be at least 8 characters.");
  }
  localStorage.setItem(SUPER_ADMIN_AUTH_KEY, JSON.stringify({
    password,
    mustChangePassword: false,
    lastLoginAt: null,
  }));
}

const COMMISSION_DEFAULT_RATE = 5;
const COMMISSION_DEFAULT_MINIMUM = 5;
const DEFAULT_SETTINGS = {
  commissionRate: COMMISSION_DEFAULT_RATE,
  commissionMin: COMMISSION_DEFAULT_MINIMUM,
  tokenExpiryDays: 7,
  overdueDays: 0,
};
const DELIVERED_STATUSES = new Set(["Delivered", "Delivered and Paid", "Cash received and delivered"]);
const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function getSettings() {
  const value = localStorage.getItem(SETTINGS_KEY);
  if (!value) return { ...DEFAULT_SETTINGS };
  const saved = JSON.parse(value);
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
    throw new Error("Saved application settings are invalid.");
  }
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function saveSettings(settings, actor) {
  const next = {
    commissionRate: Number(settings.commissionRate),
    commissionMin: Number(settings.commissionMin),
    tokenExpiryDays: Number(settings.tokenExpiryDays),
    overdueDays: Number(settings.overdueDays),
  };
  if (!Number.isFinite(next.commissionRate) || next.commissionRate < 0 ||
      !Number.isFinite(next.commissionMin) || next.commissionMin < 0 ||
      !Number.isInteger(next.tokenExpiryDays) || next.tokenExpiryDays < 1 ||
      !Number.isInteger(next.overdueDays) || next.overdueDays < 0) {
    throw new Error("Enter valid non-negative commission settings, a token expiry of at least one day, and whole overdue days.");
  }
  const previous = getSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  logAudit({
    actor,
    action: "settings.changed",
    targetType: "settings",
    targetId: "application",
    details: `Commission defaults ${previous.commissionRate}% / ${previous.commissionMin} to ${next.commissionRate}% / ${next.commissionMin}; token expiry ${next.tokenExpiryDays} days; overdue rule ${next.overdueDays} days.`,
  });
  return next;
}

export function logAudit({ actor, action, targetType, targetId, details = "" }) {
  if (!action || !targetType) throw new Error("Audit action and target type are required.");
  const entry = {
    id: crypto.randomUUID(),
    at: Date.now(),
    actorId: actor?.id || "",
    actorName: actor?.name || "System",
    actorRole: actor?.role || "system",
    action,
    targetType,
    targetId: String(targetId || ""),
    details: String(details),
  };
  localStorage.setItem(AUDIT_KEY, JSON.stringify([entry, ...readList(AUDIT_KEY, "audit")]));
  return entry;
}

export function getAudit() {
  return readList(AUDIT_KEY, "audit").sort((a, b) => Number(b.at) - Number(a.at));
}

function makeTokenCode() {
  const part = () => Array.from({ length: 4 }, () =>
    TOKEN_ALPHABET[Math.floor(Math.random() * TOKEN_ALPHABET.length)],
  ).join("");
  return `KND-ADM-${part()}-${part()}`;
}

function readList(key, label) {
  const value = localStorage.getItem(key);
  if (!value) return [];
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    throw new Error(`Saved ${label} data is invalid.`);
  }
  return parsed;
}

function getAllUsers() {
  return readList(USERS_KEY, "account");
}

function getUserById(userId) {
  return getAllUsers().find((user) => user.id === userId);
}

function resolveRecordSocietyId(record, kind) {
  if (record.societyId) return record.societyId;
  const ownerId = kind === "user"
    ? record.id
    : kind === "dish" || kind === "order" || kind === "review"
      ? record.sellerId
      : record.authorId;
  const owner = ownerId && getUserById(ownerId);
  if (!owner && kind === "order" && record.buyerId) {
    const buyer = getUserById(record.buyerId);
    if (buyer?.societyId) return buyer.societyId;
  }
  if (owner?.societyId) return owner.societyId;
  const societyName = owner?.society || record.society;
  return societyName ? getSocieties().find((society) => society.name === societyName)?.id : undefined;
}

function filterToSociety(records, societyId, kind) {
  if (!societyId) return records;
  return records.filter((record) => resolveRecordSocietyId(record, kind) === societyId);
}

export function getSocieties() {
  return readList(SOCIETIES_KEY, "society");
}

export function getSociety(societyId) {
  return getSocieties().find((society) =>
    society.id === societyId || society.name === societyId,
  ) || null;
}

export function getPlatformStats() {
  const societies = getSocieties();
  const chefs = getSellers();
  const buyers = getBuyers();
  const orders = getOrders();
  const issues = getIssues();
  const today = new Date();
  const ordersToday = orders.filter((order) =>
    new Date(Number(order.createdAt) || order.createdAt || 0).toDateString() === today.toDateString(),
  );
  const delivered = orders.filter((order) => DELIVERED_STATUSES.has(order.status));
  const settled = delivered.filter((order) => order.commissionSettled === true);
  const outstanding = delivered.filter((order) => order.commissionSettled !== true);
  const tokens = getTokens();
  return {
    societyCount: societies.length,
    chefCount: chefs.length,
    buyerCount: buyers.length,
    ordersToday: ordersToday.length,
    gmv: delivered.reduce((sum, order) => sum + Number(order.total || 0), 0),
    commissionEarned: settled.reduce((sum, order) => sum + Number(order.commissionAmount || 0), 0),
    commissionOutstanding: outstanding.reduce((sum, order) => sum + Number(order.commissionAmount || 0), 0),
    societies,
    chefs,
    buyers,
    orders,
    issues,
    tokens,
  };
}

export function getSocietyStats(societyId) {
  const society = getSociety(societyId);
  if (!society) throw new Error("That society could not be found.");
  const chefs = getSellers(societyId);
  const buyers = getBuyers(societyId);
  const orders = getOrders(societyId);
  const delivered = orders.filter((order) => DELIVERED_STATUSES.has(order.status));
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return {
    flats: Number(society.expectedFlats || 0),
    chefs: chefs.length,
    buyers: buyers.length,
    monthlySales: delivered
      .filter((order) => new Date(Number(order.createdAt) || order.createdAt || 0).getTime() >= monthStart.getTime())
      .reduce((sum, order) => sum + Number(order.total || 0), 0),
  };
}

function referralCodeFor(name) {
  const letters = String(name).toUpperCase().replace(/[^A-Z]/g, "");
  const prefix = (letters + "XXX").slice(0, 3);
  return `KND-${prefix}-${String(Math.floor(1000 + Math.random() * 9000))}`;
}

export function createSociety(values) {
  const name = String(values.name || "").trim();
  if (!name) throw new Error("Society name is required.");
  const societies = getSocieties();
  if (societies.some((society) => society.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("A society with that name already exists.");
  }
  const settings = getSettings();
  const society = {
    id: crypto.randomUUID(),
    name,
    address: String(values.address || "").trim(),
    city: String(values.city || "").trim(),
    adminId: values.adminId || "",
    referralCode: referralCodeFor(name),
    referralActive: true,
    expectedFlats: Math.max(0, Number(values.expectedFlats || 0)),
    status: "active",
    commissionRate: Number(values.commissionRate ?? settings.commissionRate),
    commissionMin: Number(values.commissionMin ?? settings.commissionMin),
    createdAt: Date.now(),
  };
  localStorage.setItem(SOCIETIES_KEY, JSON.stringify([...societies, society]));
  return society;
}

export function updateSociety(societyId, changes, actor) {
  const societies = getSocieties();
  const index = societies.findIndex((society) => society.id === societyId);
  if (index < 0) throw new Error("That society could not be found.");
  const before = societies[index];
  const allowed = ["name", "address", "city", "expectedFlats", "commissionRate", "commissionMin"];
  const updated = { ...before };
  allowed.forEach((key) => {
    if (Object.hasOwn(changes, key)) updated[key] = changes[key];
  });
  updated.name = String(updated.name || "").trim();
  updated.address = String(updated.address || "").trim();
  updated.city = String(updated.city || "").trim();
  updated.expectedFlats = Math.max(0, Number(updated.expectedFlats || 0));
  updated.commissionRate = Number(updated.commissionRate);
  updated.commissionMin = Number(updated.commissionMin);
  if (!updated.name || !Number.isFinite(updated.commissionRate) || updated.commissionRate < 0 ||
      !Number.isFinite(updated.commissionMin) || updated.commissionMin < 0 ||
      !Number.isFinite(updated.expectedFlats)) {
    throw new Error("Enter a society name, valid flat count, and non-negative commission values.");
  }
  if (societies.some((society, itemIndex) => itemIndex !== index && society.name.toLowerCase() === updated.name.toLowerCase())) {
    throw new Error("A society with that name already exists.");
  }
  societies[index] = updated;
  localStorage.setItem(SOCIETIES_KEY, JSON.stringify(societies));
  if (before.commissionRate !== updated.commissionRate || before.commissionMin !== updated.commissionMin) {
    logAudit({
      actor, action: "society.commission_changed", targetType: "society", targetId: societyId,
      details: `${before.commissionRate}% / ₹${before.commissionMin} changed to ${updated.commissionRate}% / ₹${updated.commissionMin}. Existing order snapshots are unchanged.`,
    });
  }
  return updated;
}

export function suspendSociety(societyId, suspended, actor) {
  const societies = getSocieties();
  const index = societies.findIndex((society) => society.id === societyId);
  if (index < 0) throw new Error("That society could not be found.");
  const society = { ...societies[index], status: suspended ? "suspended" : "active" };
  societies[index] = society;
  localStorage.setItem(SOCIETIES_KEY, JSON.stringify(societies));
  if (suspended) {
    const users = getAllUsers().map((user) => user.societyId === societyId && user.role === "seller"
      ? { ...user, online: false }
      : user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    const sessionValue = localStorage.getItem(SESSION_KEY);
    if (sessionValue) {
      const session = JSON.parse(sessionValue);
      if (session.societyId === societyId && session.role === "seller") {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, online: false }));
      }
    }
  }
  logAudit({
    actor, action: suspended ? "society.suspended" : "society.reactivated",
    targetType: "society", targetId: societyId, details: `${society.name} ${suspended ? "suspended" : "reactivated"}.`,
  });
  return society;
}

export function createToken(societyId, actor, expiryDays = getSettings().tokenExpiryDays) {
  const society = getSociety(societyId);
  if (!society) throw new Error("That society could not be found.");
  if (society.status === "suspended") throw new Error("Reactivate the society before generating an admin invite.");
  if (society.adminId) throw new Error("This society already has an administrator. Replace the current admin to issue a new invite.");
  const expiry = Number(expiryDays);
  if (!Number.isInteger(expiry) || expiry < 1) throw new Error("Token expiry must be at least one day.");
  const tokens = readList(TOKENS_KEY, "admin token");
  let code = makeTokenCode();
  while (tokens.some((token) => token.code === code)) code = makeTokenCode();
  const token = {
    id: crypto.randomUUID(),
    societyId,
    code,
    status: "unused",
    expiresAt: Date.now() + expiry * 86_400_000,
    createdAt: Date.now(),
    claimedBy: null,
    claimedAt: null,
  };
  localStorage.setItem(TOKENS_KEY, JSON.stringify([token, ...tokens]));
  logAudit({ actor, action: "admin_token.generated", targetType: "admin_token", targetId: token.id, details: `Invite generated for ${society.name}; expires in ${expiry} days.` });
  return token;
}

export function getTokens(societyId) {
  const now = Date.now();
  return readList(TOKENS_KEY, "admin token")
    .filter((token) => !societyId || token.societyId === societyId)
    .map((token) => token.status === "unused" && Number(token.expiresAt) <= now
      ? { ...token, status: "expired" }
      : token)
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
}

export function revokeToken(tokenId, actor) {
  const tokens = readList(TOKENS_KEY, "admin token");
  const index = tokens.findIndex((token) => token.id === tokenId);
  if (index < 0) throw new Error("That invite token could not be found.");
  const effective = tokens[index].status === "unused" && Number(tokens[index].expiresAt) <= Date.now()
    ? "expired"
    : tokens[index].status;
  if (effective !== "unused") throw new Error(`This token is ${effective} and cannot be revoked.`);
  tokens[index] = { ...tokens[index], status: "revoked" };
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  logAudit({ actor, action: "admin_token.revoked", targetType: "admin_token", targetId: tokenId, details: `Invite ${tokens[index].code} revoked.` });
  return tokens[index];
}

export function regenerateToken(tokenId, actor) {
  const token = getTokens().find((item) => item.id === tokenId);
  if (!token) throw new Error("That invite token could not be found.");
  if (token.status === "unused") revokeToken(tokenId, actor);
  return createToken(token.societyId, actor);
}

export function claimToken(code, account, actor) {
  const cleanCode = String(code || "").trim().toUpperCase();
  const tokens = readList(TOKENS_KEY, "admin token");
  const index = tokens.findIndex((token) => token.code === cleanCode);
  if (index < 0) throw new Error("Invalid invite token. Check the code and try again.");
  const token = tokens[index];
  const status = token.status === "unused" && Number(token.expiresAt) <= Date.now() ? "expired" : token.status;
  if (status === "expired") throw new Error("This invite token has expired. Ask the App Admin for a new one.");
  if (status === "revoked") throw new Error("This invite token was revoked. Ask the App Admin for a new one.");
  if (status === "claimed") throw new Error("This invite token has already been claimed.");
  const society = getSociety(token.societyId);
  if (!society || society.status === "suspended") throw new Error("This society is unavailable for admin registration.");
  if (society.adminId) throw new Error("This society already has an administrator.");
  const users = getAllUsers();
  const mobile = String(account.mobile || "").replace(/\D/g, "");
  const email = String(account.email || "").trim().toLowerCase();
  if (!/^\d{10,13}$/.test(mobile)) throw new Error("Enter a mobile number with 10–13 digits.");
  if (String(account.password || "").length < 8) throw new Error("Password must be at least 8 characters.");
  if (!String(account.name || "").trim()) throw new Error("Full name is required.");
  if (users.some((user) => user.mobile === mobile || (email && user.email?.toLowerCase() === email))) {
    throw new Error("An account with that mobile or email already exists.");
  }
  const admin = {
    id: crypto.randomUUID(),
    name: String(account.name).trim(),
    mobile,
    email,
    password: account.password,
    role: "admin",
    status: "approved",
    disabled: false,
    societyId: society.id,
    society: society.name,
    createdAt: Date.now(),
  };
  tokens[index] = { ...token, status: "claimed", claimedBy: admin.id, claimedAt: Date.now() };
  society.adminId = admin.id;
  localStorage.setItem(USERS_KEY, JSON.stringify([...users, admin]));
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  localStorage.setItem(SOCIETIES_KEY, JSON.stringify(getSocieties().map((item) => item.id === society.id ? society : item)));
  logAudit({ actor: actor || admin, action: "admin_token.claimed", targetType: "admin_token", targetId: token.id, details: `${admin.name} claimed an invite for ${society.name}.` });
  const { password, ...safeAdmin } = admin;
  return safeAdmin;
}

export function replaceAdmin(societyId, actor) {
  assertSuperAdmin(actor);
  const societies = getSocieties();
  const society = societies.find((item) => item.id === societyId);
  if (!society) throw new Error("That society could not be found.");
  const users = getAllUsers();
  const oldAdminId = society.adminId;
  if (oldAdminId) {
    const index = users.findIndex((user) => user.id === oldAdminId && user.role === "admin");
    if (index >= 0) users[index] = { ...users[index], disabled: true, disabledAt: Date.now() };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    const sessionValue = localStorage.getItem(SESSION_KEY);
    if (sessionValue) {
      const session = JSON.parse(sessionValue);
      if (session.id === oldAdminId) localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, disabled: true }));
    }
  }
  society.adminId = "";
  localStorage.setItem(SOCIETIES_KEY, JSON.stringify(societies));
  logAudit({ actor, action: "admin.replaced", targetType: "society", targetId: societyId, details: `Previous admin ${oldAdminId || "none"} disabled; replacement invite created.` });
  return createToken(societyId, actor);
}

export function setAdminDisabled(adminId, disabled, actor) {
  assertSuperAdmin(actor);
  const users = getAllUsers();
  const index = users.findIndex((user) => user.id === adminId && user.role === "admin");
  if (index < 0) throw new Error("That Society Admin could not be found.");
  users[index] = {
    ...users[index],
    ...(disabled ? {} : { status: "approved" }),
    disabled: Boolean(disabled),
    disabledAt: disabled ? Date.now() : null,
  };
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const sessionValue = localStorage.getItem(SESSION_KEY);
  if (sessionValue) {
    const session = JSON.parse(sessionValue);
    if (session.id === adminId) localStorage.setItem(SESSION_KEY, JSON.stringify({
      ...session,
      status: users[index].status,
      disabled: Boolean(disabled),
    }));
  }
  logAudit({ actor, action: disabled ? "admin.disabled" : "admin.enabled", targetType: "admin", targetId: adminId, details: `${users[index].name} ${disabled ? "disabled" : "enabled"}.` });
  return users[index];
}

export function setAdminStatus(adminId, status, actor) {
  assertSuperAdmin(actor);
  if (!["approved", "rejected", "suspended"].includes(status)) {
    throw new Error("Choose a valid Society Admin status.");
  }
  const users = getAllUsers();
  const index = users.findIndex((user) => user.id === adminId && user.role === "admin");
  if (index < 0) throw new Error("That Society Admin could not be found.");
  const admin = {
    ...users[index],
    status,
    disabled: status !== "approved",
    disabledAt: status === "approved" ? null : Date.now(),
  };
  users[index] = admin;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const sessionValue = localStorage.getItem(SESSION_KEY);
  if (sessionValue) {
    const session = JSON.parse(sessionValue);
    if (session.id === adminId) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        ...session,
        status,
        disabled: admin.disabled,
      }));
    }
  }
  logAudit({
    actor,
    action: `admin.${status}`,
    targetType: "admin",
    targetId: adminId,
    details: `${admin.name} status changed to ${status}.`,
  });
  return admin;
}

export function regenerateReferral(societyId) {
  const societies = getSocieties();
  const index = societies.findIndex((society) => society.id === societyId);
  if (index < 0) throw new Error("That society could not be found.");
  societies[index] = { ...societies[index], referralCode: referralCodeFor(societies[index].name) };
  localStorage.setItem(SOCIETIES_KEY, JSON.stringify(societies));
  return societies[index];
}

export function setReferralActive(societyId, active) {
  const societies = getSocieties();
  const index = societies.findIndex((society) => society.id === societyId);
  if (index < 0) throw new Error("That society could not be found.");
  societies[index] = { ...societies[index], referralActive: Boolean(active) };
  localStorage.setItem(SOCIETIES_KEY, JSON.stringify(societies));
  return societies[index];
}

export function validateReferralCode(societyId, code) {
  const society = getSociety(societyId);
  return Boolean(
    society &&
    society.referralActive &&
    String(code || "").trim().toUpperCase() === society.referralCode,
  );
}

export function getSocietyIdForUser(user) {
  return user?.societyId || (user?.society
    ? getSocieties().find((society) => society.name === user.society)?.id
    : undefined);
}

export function getEffectiveSocietyId(record, kind) {
  return resolveRecordSocietyId(record, kind);
}

export function saveAnnouncement(societyId, text) {
  if (!getSociety(societyId)) throw new Error("That society could not be found.");
  const stored = localStorage.getItem(ANNOUNCEMENT_KEY);
  let announcements = {};
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) announcements = parsed;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
  }
  const cleanText = String(text || "").trim();
  if (cleanText) announcements[societyId] = { text: cleanText };
  else delete announcements[societyId];
  localStorage.setItem(ANNOUNCEMENT_KEY, JSON.stringify(announcements));
  return cleanText;
}

export function updateUserStatus(userId, societyId, status, extra = {}, actor) {
  assertSocietyAdmin(actor, societyId);
  const users = getAllUsers();
  const index = users.findIndex((user) => user.id === userId && user.societyId === societyId);
  if (index < 0) throw new Error("That resident could not be found in this society.");
  const account = users[index];
  const allowedStatuses = account.role === "buyer"
    ? ["pending", "approved", "rejected", "suspended"]
    : account.role === "seller"
      ? ["pending", "verified", "rejected", "suspended"]
      : [];
  if (!allowedStatuses.includes(status)) {
    throw new Error("That status is not available for this account.");
  }
  const allowedExtra = account.role === "seller" ? ["online", "banReason", "bannedAt", "bannedBy"] : [];
  const changes = Object.fromEntries(Object.entries(extra).filter(([key]) => allowedExtra.includes(key)));
  if (account.role === "seller" && ["pending", "rejected", "suspended"].includes(status)) {
    changes.online = false;
  }
  users[index] = { ...account, ...changes, status };
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  if (users[index].role === "buyer" && actor) {
    logAudit({
      actor,
      action: `buyer.${status}`,
      targetType: "buyer",
      targetId: userId,
      details: `${users[index].name} status changed to ${status}.`,
    });
  }
  return users[index];
}

export function verifySeller(sellerId, societyId, actor) {
  const account = getAllUsers().find((user) => user.id === sellerId && user.societyId === societyId);
  if (!account || account.role !== "seller") throw new Error("That resident is not a chef.");
  const seller = updateUserStatus(sellerId, societyId, "verified", {
    online: false,
    banReason: "",
    bannedAt: null,
    bannedBy: "",
  }, actor);
  if (actor) logAudit({ actor, action: "chef.verified", targetType: "chef", targetId: sellerId, details: `${seller.kitchenName || seller.name} verified.` });
  return seller;
}

export function banSeller(sellerId, societyId, reason, actor) {
  assertSocietyAdmin(actor, societyId);
  const cleanReason = String(reason || "").trim();
  if (!cleanReason) throw new Error("A ban reason is required.");
  const users = getAllUsers();
  const sellerIndex = users.findIndex(
    (user) => user.id === sellerId && user.societyId === societyId && user.role === "seller",
  );
  if (sellerIndex < 0) throw new Error("That chef could not be found in this society.");
  const seller = {
    ...users[sellerIndex],
    status: "banned",
    online: false,
    banReason: cleanReason,
    bannedAt: Date.now(),
    bannedBy: "admin",
  };
  const originalSeller = users[sellerIndex];
  users[sellerIndex] = seller;
  const allOrders = getOrders();
  const cancelled = allOrders.filter((order) => order.sellerId === sellerId &&
    (order.societyId || resolveRecordSocietyId(order, "order")) === societyId &&
    order.status === "Placed");
  const cancelledIds = new Set(cancelled.map((order) => order.id));
  const nextOrders = allOrders.map((order) => cancelledIds.has(order.id)
    ? { ...order, status: "Cancelled" }
    : order);
  const dishes = getDishes();
  const restoredDishes = dishes.map((dish) => {
    if (dish.sellerId !== sellerId) return dish;
    const amount = cancelled.reduce((sum, order) => sum + (order.items || [])
      .filter((item) => item.dishId === dish.id)
      .reduce((itemSum, item) => itemSum + Number(item.qty || 0), 0), 0);
    return amount ? { ...dish, stock: Number(dish.stock) + amount } : dish;
  });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  saveDishes(restoredDishes);
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(nextOrders));
    const session = localStorage.getItem(SESSION_KEY);
    if (session && JSON.parse(session).id === sellerId) {
      const sessionSeller = { ...seller };
      delete sessionSeller.password;
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionSeller));
    }
  } catch (error) {
    saveDishes(dishes);
    users[sellerIndex] = originalSeller;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    throw error;
  }
  if (actor) logAudit({ actor, action: "chef.banned", targetType: "chef", targetId: sellerId, details: `${seller.kitchenName || seller.name} banned: ${cleanReason}` });
  return seller;
}

export function unbanSeller(sellerId, societyId, actor) {
  assertSocietyAdmin(actor, societyId);
  const chef = getAllUsers().find((user) => user.id === sellerId && user.societyId === societyId);
  if (!chef || chef.role !== "seller") throw new Error("That chef could not be found in this society.");
  const seller = updateUserStatus(sellerId, societyId, "verified", {
    online: false,
    banReason: "",
    bannedAt: null,
    bannedBy: "",
  }, actor);
  if (actor) logAudit({ actor, action: "chef.unbanned", targetType: "chef", targetId: sellerId, details: `${seller.kitchenName || seller.name} unbanned.` });
  return seller;
}

export function setSellerStatus(sellerId, societyId, status, actor) {
  const allowedStatuses = ["pending", "verified", "rejected", "suspended"];
  if (!allowedStatuses.includes(status)) {
    throw new Error("Choose a valid chef status.");
  }
  const extra = status === "verified" || status === "rejected" || status === "suspended"
    ? { online: false, banReason: "", bannedAt: null, bannedBy: "" }
    : {};
  const seller = updateUserStatus(sellerId, societyId, status, extra, actor);
  if (actor) {
    logAudit({
      actor,
      action: `chef.${status}`,
      targetType: "chef",
      targetId: sellerId,
      details: `${seller.kitchenName || seller.name} status changed to ${status}.`,
    });
  }
  return seller;
}

export function setBuyerStatus(buyerId, status, actor) {
  const buyer = getBuyers().find((item) => item.id === buyerId);
  if (!buyer) throw new Error("That buyer could not be found.");
  if (!["pending", "approved", "rejected", "suspended"].includes(status)) {
    throw new Error("Choose a valid buyer status.");
  }
  return updateUserStatus(buyerId, buyer.societyId || getSocietyIdForUser(buyer), status, {}, actor);
}

export function getIssues(societyId) {
  return filterToSociety(readList(ISSUES_KEY, "issue"), societyId, "issue")
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
}

export function createIssue(issue) {
  const order = getOrders().find((item) => item.id === issue.orderId && item.buyerId === issue.raisedBy);
  if (!order) throw new Error("An issue can only be raised by the buyer who placed this order.");
  if (!issue.description?.trim()) throw new Error("Describe the issue before submitting it.");
  const issueRecord = {
    id: crypto.randomUUID(),
    societyId: issue.societyId || order.societyId || resolveRecordSocietyId(order, "order"),
    orderId: order.id,
    raisedBy: issue.raisedBy,
    raisedByName: issue.raisedByName,
    sellerId: order.sellerId,
    category: issue.category,
    description: issue.description.trim(),
    status: "Open",
    messages: [{
      by: issue.raisedBy,
      role: "buyer",
      text: issue.description.trim(),
      at: Date.now(),
    }],
    outcome: "",
    resolutionNote: "",
    resolvedBy: null,
    resolvedAt: null,
    createdAt: Date.now(),
  };
  localStorage.setItem(ISSUES_KEY, JSON.stringify([issueRecord, ...readList(ISSUES_KEY, "issue")]));
  return issueRecord;
}

export function addIssueMessage(issueId, user, text) {
  if (!["buyer", "seller", "admin"].includes(user?.role)) {
    throw new Error("Only the buyer, chef, or assigned Society Admin can message about this issue.");
  }
  assertActiveActor(user, user.role);
  const cleanText = String(text || "").trim();
  if (!cleanText) throw new Error("Write a message before sending it.");
  const issues = readList(ISSUES_KEY, "issue");
  const index = issues.findIndex((issue) => issue.id === issueId);
  if (index < 0) throw new Error("That issue could not be found.");
  const issue = issues[index];
  if (issue.societyId !== user.societyId ||
      ![issue.raisedBy, issue.sellerId, getSociety(issue.societyId)?.adminId].includes(user.id)) {
    throw new Error("You don't have access to this issue.");
  }
  if (["Resolved", "Dismissed"].includes(issue.status)) {
    throw new Error("This issue is closed and no longer accepts messages.");
  }
  const updated = {
    ...issue,
    messages: [...(issue.messages || []), { by: user.id, role: user.role, text: cleanText, at: Date.now() }],
  };
  issues[index] = updated;
  localStorage.setItem(ISSUES_KEY, JSON.stringify(issues));
  return updated;
}

export function updateIssueStatus(issueId, admin, { status, outcome = "", note = "" }) {
  assertSocietyAdmin(admin, admin?.societyId);
  const issues = readList(ISSUES_KEY, "issue");
  const index = issues.findIndex((issue) => issue.id === issueId);
  if (index < 0 || issues[index].societyId !== admin.societyId ||
      getSociety(admin.societyId)?.adminId !== admin.id) {
    throw new Error("That issue could not be found in your society.");
  }
  if (!["In review", "Resolved", "Dismissed"].includes(status)) {
    throw new Error("Choose a valid issue status.");
  }
  if (["Resolved", "Dismissed"].includes(status) && !note.trim()) {
    throw new Error("A resolution note is required.");
  }
  let bannedChef = null;
  if (status === "Resolved" && outcome === "Chef banned") {
    bannedChef = banSeller(issues[index].sellerId, admin.societyId, note, admin);
  }
  const updated = {
    ...issues[index],
    status,
    outcome: status === "Resolved" ? outcome : "",
    resolutionNote: ["Resolved", "Dismissed"].includes(status) ? note.trim() : "",
    resolvedBy: ["Resolved", "Dismissed"].includes(status) ? admin.id : null,
    resolvedAt: ["Resolved", "Dismissed"].includes(status) ? Date.now() : null,
  };
  issues[index] = updated;
  localStorage.setItem(ISSUES_KEY, JSON.stringify(issues));
  if (["Resolved", "Dismissed"].includes(status)) {
    logAudit({ actor: admin, action: "issue.resolved", targetType: "issue", targetId: issueId, details: `Issue ${status.toLowerCase()}: ${note.trim()}` });
  }
  return { issue: updated, bannedChef };
}

export function getDishes(societyId) {
  return filterToSociety(readList(DISHES_KEY, "dish"), societyId, "dish");
}

export function saveDishes(dishes) {
  localStorage.setItem(DISHES_KEY, JSON.stringify(dishes.map((dish) => ({
    ...dish,
    societyId: dish.societyId || getEffectiveSocietyId(getUserById(dish.sellerId), "user"),
  }))));
}

export function updateDish(dishId, sellerId, changes) {
  const dishes = getDishes();
  const index = dishes.findIndex((dish) => dish.id === dishId && dish.sellerId === sellerId);
  if (index < 0) throw new Error("That dish could not be found.");
  const updatedDish = { ...dishes[index], ...changes, id: dishId, sellerId };
  dishes[index] = updatedDish;
  saveDishes(dishes);
  return updatedDish;
}

export function deleteDish(dishId, sellerId) {
  const dishes = getDishes();
  const updatedDishes = dishes.filter((dish) => !(dish.id === dishId && dish.sellerId === sellerId));
  if (updatedDishes.length === dishes.length) throw new Error("That dish could not be found.");
  saveDishes(updatedDishes);
}

export function updateSeller(sellerId, changes) {
  const users = readList(USERS_KEY, "account");
  const index = users.findIndex((user) => user.id === sellerId && user.role === "seller");
  if (index < 0) throw new Error("That seller account could not be found.");

  if (changes.online === true) {
    const currentSeller = users[index];
    if (currentSeller.status !== "verified") throw new Error("Only verified chefs can go online.");
    const society = getSociety(currentSeller.societyId || getSocietyIdForUser(currentSeller));
    if (!society || society.status === "suspended") throw new Error("Your society is currently suspended.");
    const settings = getSettings();
    if (settings.overdueDays > 0) {
      const oldestUnsettled = getOrders(currentSeller.societyId)
        .filter((order) => order.sellerId === sellerId && DELIVERED_STATUSES.has(order.status) && order.commissionSettled !== true)
        .reduce((oldest, order) => Math.min(oldest, new Date(Number(order.createdAt) || order.createdAt || 0).getTime()), Infinity);
      if (Number.isFinite(oldestUnsettled) && Date.now() - oldestUnsettled > settings.overdueDays * 86_400_000) {
        throw new Error("Please settle your commission to go online.");
      }
    }
  }

  const updatedSeller = { ...users[index], ...changes, id: sellerId, role: "seller" };
  users[index] = updatedSeller;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  const sessionValue = localStorage.getItem(SESSION_KEY);
  if (sessionValue) {
    const session = JSON.parse(sessionValue);
    if (session.id === sellerId) {
      const sessionSeller = { ...updatedSeller };
      delete sessionSeller.password;
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionSeller));
      return sessionSeller;
    }
  }

  const sessionSeller = { ...updatedSeller };
  delete sessionSeller.password;
  return sessionSeller;
}

export function getSellers(societyId) {
  return filterToSociety(
    readList(USERS_KEY, "account").filter((user) => user.role === "seller"),
    societyId,
    "user",
  ).map((seller) => ({
    ...seller,
    status: seller.status === "approved" ? "verified" : seller.status,
    societyId: seller.societyId || getSocietyIdForUser(seller),
  }));
}

export function getBuyers(societyId) {
  return filterToSociety(
    readList(USERS_KEY, "account").filter((user) => user.role === "buyer"),
    societyId,
    "user",
  );
}

export function getAdmins(societyId) {
  return filterToSociety(
    readList(USERS_KEY, "account").filter((user) => user.role === "admin"),
    societyId,
    "user",
  );
}

export function getReviews(societyId) {
  return filterToSociety(readList(REVIEWS_KEY, "review"), societyId, "review");
}

export function addReview(review) {
  const buyerOrders = getOrdersByBuyer(review.buyerId);
  const isBuyer = readList(USERS_KEY, "account")
    .some((user) => user.id === review.buyerId && user.role === "buyer");
  if (
    !review.buyerId ||
    !isBuyer ||
    !buyerOrders.some((order) => order.sellerId === review.sellerId && DELIVERED_STATUSES.has(order.status))
  ) {
    throw new Error("You can review a cook after an order has been delivered.");
  }
  const reviews = getReviews();
  const newReview = {
    ...review,
    societyId: review.societyId || getEffectiveSocietyId(
      getUserById(review.sellerId),
      "user",
    ),
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(REVIEWS_KEY, JSON.stringify([...reviews, newReview]));
  return newReview;
}

export function getAnnouncement(societyId) {
  const value = localStorage.getItem(ANNOUNCEMENT_KEY);
  if (!value) return "";
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "string") {
      const societies = getSocieties();
      return societies.length === 1 && societies[0].id === societyId ? parsed : "";
    }
    if (Array.isArray(parsed)) return parsed.find((item) => item.societyId === societyId)?.text || "";
    if (typeof parsed === "object") return parsed[societyId]?.text || "";
    return "";
  } catch (error) {
    if (error instanceof SyntaxError) return value;
    throw error;
  }
}

export function getCart() {
  return readList(CART_KEY, "cart");
}

export function saveCart(items) {
  if (items.length === 0) {
    localStorage.removeItem(CART_KEY);
    return;
  }
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function getCommissionConfig(society) {
  const societyRecord = getSociety(society);
  const defaults = getSettings();
  const value = localStorage.getItem(COMMISSION_CONFIGS_KEY);
  const configs = value ? JSON.parse(value) : {};
  if (!configs || typeof configs !== "object" || Array.isArray(configs)) {
    throw new Error("Saved commission configuration is invalid.");
  }
  const configured = Object.hasOwn(configs, society) ? configs[society] : {};
  if (!configured || typeof configured !== "object" || Array.isArray(configured) ||
      (configured.model && configured.model !== "percent_with_min")) {
    throw new Error("Saved commission configuration is invalid.");
  }
  const rate = Number(societyRecord?.commissionRate ?? configured.rate ?? defaults.commissionRate);
  const minAmount = Number(societyRecord?.commissionMin ?? configured.minAmount ?? defaults.commissionMin);
  if (!Number.isFinite(rate) || rate < 0 || !Number.isFinite(minAmount) || minAmount < 0) {
    throw new Error("Saved commission configuration is invalid.");
  }
  return { model: "percent_with_min", rate, minAmount };
}

export function saveCommissionConfig(society, config) {
  const name = String(society || "").trim();
  if (!name || !config || typeof config !== "object" || Array.isArray(config) ||
      (config.model && config.model !== "percent_with_min")) {
    throw new Error("Choose a society and a supported commission model.");
  }
  const rate = Number(config.rate);
  const minAmount = Number(config.minAmount);
  if (!Number.isFinite(rate) || rate < 0 || !Number.isFinite(minAmount) || minAmount < 0) {
    throw new Error("Commission rate and minimum must be valid non-negative amounts.");
  }
  const stored = localStorage.getItem(COMMISSION_CONFIGS_KEY);
  const configs = stored ? JSON.parse(stored) : {};
  if (!configs || typeof configs !== "object" || Array.isArray(configs)) {
    throw new Error("Saved commission configuration is invalid.");
  }
  const next = { ...configs, [name]: { model: "percent_with_min", rate, minAmount } };
  localStorage.setItem(COMMISSION_CONFIGS_KEY, JSON.stringify(next));
  return next[name];
}

export function calcCommission(total, config) {
  const amount = Number(total);
  const rate = Number(config?.rate);
  const minAmount = Number(config?.minAmount);
  if ((config?.model && config.model !== "percent_with_min") || Array.isArray(config) ||
      !Number.isFinite(amount) || amount < 0 || !Number.isFinite(rate) || rate < 0 ||
      !Number.isFinite(minAmount) || minAmount < 0) {
    throw new Error("Commission inputs must be valid non-negative amounts.");
  }
  return Math.round(Math.min(amount, Math.max(amount * rate / 100, minAmount)) * 100) / 100;
}

export function getOrders(societyId) {
  return filterToSociety(readList(ORDERS_KEY, "order"), societyId, "order");
}

export function getOrdersByBuyer(buyerId, societyId) {
  return getOrders(societyId)
    .filter((order) => order.buyerId === buyerId)
    .sort((a, b) =>
      new Date(typeof b.createdAt === "number" ? b.createdAt : b.createdAt || 0) -
      new Date(typeof a.createdAt === "number" ? a.createdAt : a.createdAt || 0),
    );
}

export function getCartIssues(items, societyId) {
  const sellers = new Map(getSellers(societyId).map((seller) => [seller.id, seller]));
  const dishes = new Map(getDishes(societyId).map((dish) => [dish.id, dish]));
  const quantities = new Map();
  for (const item of items) {
    const id = `${item.sellerId}:${item.dishId}`;
    quantities.set(id, (quantities.get(id) || 0) + Number(item.qty || 0));
  }
  return items.flatMap((item) => {
    const seller = sellers.get(item.sellerId);
    const dish = dishes.get(item.dishId);
    let message = "";
    if (!seller || seller.status !== "verified" || seller.online !== true ||
        seller.societyId !== societyId || getSociety(societyId)?.status === "suspended") {
      message = "This kitchen is offline and cannot take orders.";
    } else if (!dish || dish.sellerId !== seller.id || dish.available === false) {
      message = "This dish is hidden or no longer available.";
    } else if (Number(dish.stock) <= 0) {
      message = "Sold out. Remove this item or check back later.";
    } else if (quantities.get(`${item.sellerId}:${item.dishId}`) > Number(dish.stock)) {
      message = `Only ${dish.stock} portion${Number(dish.stock) === 1 ? "" : "s"} left. Reduce the quantity.`;
    } else if (!hasValidCartSelection(item, dish) || getCurrentUnitPrice(item, dish) !== Number(item.unit)) {
      message = "This dish's price or customisations changed. Remove it and add it again.";
    }
    return message ? [{ key: item.key, message }] : [];
  });
}

function getCurrentUnitPrice(item, dish) {
  return Number(dish.price) + (item.options || []).reduce((sum, selected) => {
    const group = (dish.options || []).find((option) => option.name === selected.name);
    const choice = group?.choices?.find((candidate) => candidate.label === (selected.choice || selected.label));
    return sum + Number(choice?.price || 0);
  }, 0);
}

function hasValidCartSelection(item, dish) {
  return (dish.options || []).every((group) => {
    const selected = (item.options || []).find((option) => option.name === group.name);
    return group.choices?.some((choice) => choice.label === (selected?.choice || selected?.label));
  }) && (item.options || []).every((selected) =>
    (dish.options || []).some((group) =>
      group.name === selected.name &&
      group.choices?.some((choice) => choice.label === (selected.choice || selected.label)),
    ),
  );
}

function getSellerRecord(sellerId) {
  return getSellers().find((seller) => seller.id === sellerId);
}

function addCommissionSnapshot(order, seller) {
  const config = getCommissionConfig(seller?.societyId || seller?.society || "");
  const total = Number(order.total);
  return {
    ...order,
    societyId: order.societyId || seller?.societyId || getSocietyIdForUser(seller),
    commissionRate: config.rate,
    commissionMin: config.minAmount,
    commissionAmount: calcCommission(total, config),
    commissionSettled: false,
    settledAt: null,
  };
}

export function saveOrder(order) {
  const orders = getOrders();
  const seller = getSellerRecord(order.sellerId);
  const savedOrder = {
    ...order,
    id: order.id || crypto.randomUUID(),
    createdAt: order.createdAt || Date.now(),
    societyId: order.societyId || seller?.societyId || getSocietyIdForUser(seller),
    ...(seller ? addCommissionSnapshot(order, seller) : {
      commissionRate: order.commissionRate ?? COMMISSION_DEFAULT_RATE,
      commissionMin: order.commissionMin ?? COMMISSION_DEFAULT_MINIMUM,
      commissionAmount: order.commissionAmount ?? calcCommission(order.total, {
        rate: COMMISSION_DEFAULT_RATE,
        minAmount: COMMISSION_DEFAULT_MINIMUM,
      }),
      commissionSettled: order.commissionSettled ?? false,
      settledAt: order.settledAt ?? null,
    }),
  };
  localStorage.setItem(ORDERS_KEY, JSON.stringify([savedOrder, ...orders]));
  return savedOrder;
}

export function placeOrder(order) {
  const dishes = getDishes();
  const orderItems = order.items || [];
  if (!orderItems.length) throw new Error("An order must include at least one dish.");

  const updatedDishes = [...dishes];
  for (const item of orderItems) {
    const index = updatedDishes.findIndex(
      (dish) => dish.id === item.dishId && dish.sellerId === order.sellerId,
    );
    if (index < 0) throw new Error("One of the selected dishes is no longer available.");
    const dish = updatedDishes[index];
    const seller = getSellerRecord(order.sellerId);
    const society = seller && getSociety(seller.societyId);
    if (!seller || seller.status !== "verified" || seller.online !== true ||
        (order.societyId && seller.societyId !== order.societyId) || society?.status === "suspended") {
      throw new Error("This kitchen is not currently taking orders.");
    }
    if (dish.available === false) {
      throw new Error(`${dish.name} is not currently available to order.`);
    }
    const quantity = Number(item.qty);
    if (!Number.isInteger(quantity) || quantity < 1 || Number(dish.stock) < quantity) {
      throw new Error(`${dish.name} does not have enough portions in stock.`);
    }
    updatedDishes[index] = { ...dish, stock: Number(dish.stock) - quantity };
  }

  const newOrder = {
    ...addCommissionSnapshot(order, getSellerRecord(order.sellerId)),
    id: order.id || crypto.randomUUID(),
    status: order.status || "Placed",
    societyId: order.societyId || getSocietyIdForUser(getSellerRecord(order.sellerId)),
    createdAt: order.createdAt || Date.now(),
  };
  saveDishes(updatedDishes);
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify([newOrder, ...getOrders()]));
  } catch (error) {
    saveDishes(dishes);
    throw error;
  }
  return newOrder;
}

export function placeCheckout({ buyer, items, kitchens }) {
  if (buyer?.role !== "buyer" || buyer.status !== "approved") {
    throw new Error("Ordering unlocks once your Society Admin approves your flat.");
  }
  if (!items?.length) throw new Error("Your cart is empty.");

  const sellers = getSellers();
  const dishes = getDishes();
  const sellerById = new Map(sellers.map((seller) => [seller.id, seller]));
  const dishById = new Map(dishes.map((dish) => [dish.id, dish]));
  const grouped = new Map();

  for (const item of items) {
    const seller = sellerById.get(item.sellerId);
    const dish = dishById.get(item.dishId);
    const society = seller && getSociety(seller.societyId);
    if (!seller || seller.status !== "verified" || seller.online !== true ||
        seller.societyId !== buyer.societyId || society?.status === "suspended") {
      throw new Error(`${seller?.kitchenName || item.name || "A kitchen"} is offline. Remove its items or try again later.`);
    }
    if (!dish || dish.sellerId !== seller.id || dish.available === false) {
      throw new Error(`${item.name || "A dish"} is no longer available. Remove it from your cart.`);
    }
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      throw new Error(`Choose a valid quantity for ${dish.name}.`);
    }
    const matchingQty = items
      .filter((cartItem) => cartItem.dishId === dish.id && cartItem.sellerId === seller.id)
      .reduce((sum, cartItem) => sum + Number(cartItem.qty || 0), 0);
    if (Number(dish.stock) < matchingQty) {
      throw new Error(`${dish.name} has only ${dish.stock} portion${Number(dish.stock) === 1 ? "" : "s"} left. Update its quantity.`);
    }

    const kitchen = kitchens?.[seller.id];
    if (!kitchen || !["Doorstep", "Pickup"].includes(kitchen.deliveryMode)) {
      throw new Error(`Choose a delivery option for ${seller.kitchenName || "each kitchen"}.`);
    }
    if (!["UPI", "Cash on Handover"].includes(kitchen.paymentMode)) {
      throw new Error(`Choose a payment option for ${seller.kitchenName || "each kitchen"}.`);
    }
    if (kitchen.paymentMode === "UPI" && !seller.upiId?.trim()) {
      throw new Error(`${seller.kitchenName || "This kitchen"} needs to add a UPI ID before accepting UPI payments.`);
    }
    if (kitchen.paymentMode === "UPI" && !kitchen.upiRef?.trim()) {
      throw new Error(`Enter the UPI transaction reference for ${seller.kitchenName || "this kitchen"}.`);
    }
    const group = grouped.get(seller.id) || { seller, kitchen, items: [], total: 0 };
    if (!hasValidCartSelection(item, dish)) {
      throw new Error(`${dish.name}'s customisations changed. Remove it from your cart and add it again.`);
    }
    const unit = getCurrentUnitPrice(item, dish);
    if (!Number.isFinite(unit) || unit <= 0) throw new Error(`The price for ${dish.name} is invalid.`);
    if (unit !== Number(item.unit)) {
      throw new Error(`${dish.name}'s price changed. Remove it from your cart and add it again.`);
    }
    group.items.push({
      dishId: dish.id,
      name: dish.name,
      unit,
      qty,
      options: item.options || [],
      note: item.note || "",
    });
    group.total += unit * qty;
    grouped.set(seller.id, group);
  }

  const newOrders = [...grouped.values()].map(({ seller, kitchen, items: orderItems, total }) =>
    addCommissionSnapshot({
      sellerId: seller.id,
      societyId: seller.societyId,
      buyerId: buyer.id,
      societyId: seller.societyId,
      buyerName: buyer.name,
      buyerFlat: [buyer.tower, buyer.flat].filter(Boolean).join(" · "),
      buyerPhone: buyer.mobile,
      items: orderItems,
      total: Math.round(total * 100) / 100,
      deliveryMode: kitchen.deliveryMode,
      paymentMode: kitchen.paymentMode,
      upiRef: kitchen.paymentMode === "UPI" ? kitchen.upiRef.trim() : "",
      status: "Placed",
      note: kitchen.note?.trim() || "",
      commissionSettled: false,
      settledAt: null,
    }, seller),
  ).map((order) => ({ ...order, id: crypto.randomUUID(), createdAt: Date.now() }));

  const nextDishes = dishes.map((dish) => {
    const qty = items
      .filter((item) => item.dishId === dish.id && item.sellerId === dish.sellerId)
      .reduce((sum, item) => sum + Number(item.qty), 0);
    return qty ? { ...dish, stock: Number(dish.stock) - qty } : dish;
  });
  const currentOrders = getOrders();
  const previousCart = localStorage.getItem(CART_KEY);
  saveDishes(nextDishes);
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify([...newOrders, ...currentOrders]));
    localStorage.setItem(CART_KEY, "[]");
  } catch (error) {
    saveDishes(dishes);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(currentOrders));
    if (previousCart === null) localStorage.removeItem(CART_KEY);
    else localStorage.setItem(CART_KEY, previousCart);
    throw error;
  }
  return newOrders;
}

export function getCommissionDue(sellerId) {
  return getOrders()
    .filter((order) =>
      order.sellerId === sellerId &&
      DELIVERED_STATUSES.has(order.status) &&
      order.commissionSettled !== true,
    )
    .reduce((sum, order) => sum + Number(order.commissionAmount || 0), 0);
}

export function getCommissionLedger() {
  const societies = getSocieties();
  const chefs = getSellers();
  const orders = getOrders().filter((order) => DELIVERED_STATUSES.has(order.status));
  const rows = [];
  for (const society of societies) {
    const societyOrders = orders.filter((order) => (order.societyId || resolveRecordSocietyId(order, "order")) === society.id);
    for (const chef of chefs.filter((item) => item.societyId === society.id)) {
      const chefOrders = societyOrders.filter((order) => order.sellerId === chef.id);
      if (!chefOrders.length) continue;
      const unsettled = chefOrders.filter((order) => order.commissionSettled !== true);
      rows.push({
        society,
        chef,
        deliveredCount: chefOrders.length,
        orderTotal: chefOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
        commissionOwed: unsettled.reduce((sum, order) => sum + Number(order.commissionAmount || 0), 0),
        commissionSettled: chefOrders.filter((order) => order.commissionSettled === true)
          .reduce((sum, order) => sum + Number(order.commissionAmount || 0), 0),
        oldestUnsettledAt: unsettled.length
          ? Math.min(...unsettled.map((order) => new Date(Number(order.createdAt) || order.createdAt || 0).getTime()))
          : null,
        overdueDays: unsettled.length
          ? Math.floor((Date.now() - Math.min(...unsettled.map((order) => new Date(Number(order.createdAt) || order.createdAt || 0).getTime()))) / 86_400_000)
          : null,
        orderIds: unsettled.map((order) => order.id),
        deliveredOrders: chefOrders,
      });
    }
  }
  return rows.sort((a, b) => a.society.name.localeCompare(b.society.name) || b.commissionOwed - a.commissionOwed);
}

export function markCommissionSettled(orderIds, actor) {
  const ids = new Set(orderIds);
  const settledAt = Date.now();
  const orders = getOrders();
  const updated = orders.map((order) => {
    if (
      !ids.has(order.id) ||
      !DELIVERED_STATUSES.has(order.status) ||
      order.commissionSettled === true
    ) return order;
    return { ...order, commissionSettled: true, settledAt, settledBy: actor?.id || "" };
  });
  localStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
  const settled = updated.filter((order) => ids.has(order.id) && order.commissionSettled);
  if (settled.length) {
    logAudit({
      actor,
      action: "commission.settled",
      targetType: "orders",
      targetId: settled.map((order) => order.id).join(","),
      details: `Settled ${settled.length} delivered order commission(s), total ₹${settled.reduce((sum, order) => sum + Number(order.commissionAmount || 0), 0).toFixed(2)}.`,
    });
  }
  return settled;
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function exportCommissionCsv() {
  const societyById = new Map(getSocieties().map((society) => [society.id, society]));
  const chefById = new Map(getSellers().map((chef) => [chef.id, chef]));
  const orders = getOrders().filter((order) => DELIVERED_STATUSES.has(order.status));
  const header = ["society", "chef", "order_id", "date", "order_total", "commission_rate", "commission_min", "commission_amount", "settled", "settled_at"];
  const rows = orders.map((order) => [
    societyById.get(order.societyId || resolveRecordSocietyId(order, "order"))?.name || "",
    chefById.get(order.sellerId)?.kitchenName || chefById.get(order.sellerId)?.name || "",
    order.id,
    new Date(Number(order.createdAt) || order.createdAt || 0).toISOString(),
    order.total,
    order.commissionRate ?? "",
    order.commissionMin ?? "",
    order.commissionAmount ?? "",
    order.commissionSettled === true ? "yes" : "no",
    order.settledAt ? new Date(Number(order.settledAt)).toISOString() : "",
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function cancelOrder(orderId, buyerId) {
  const orders = getOrders();
  const index = orders.findIndex((order) => order.id === orderId && order.buyerId === buyerId);
  if (index < 0) throw new Error("That order could not be found.");
  if (orders[index].status !== "Placed") throw new Error("Only placed orders can be cancelled.");

  const dishes = getDishes();
  const restocked = dishes.map((dish) => {
    if (dish.sellerId !== orders[index].sellerId) return dish;
    const quantity = (orders[index].items || [])
      .filter((item) => item.dishId === dish.id)
      .reduce((total, item) => total + Number(item.qty || 0), 0);
    return quantity ? { ...dish, stock: Number(dish.stock) + quantity } : dish;
  });
  orders[index] = { ...orders[index], status: "Cancelled" };
  saveDishes(restocked);
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch (error) {
    saveDishes(dishes);
    throw error;
  }
  return orders[index];
}

export function reorderToCart(order) {
  const sellers = new Map(getSellers().map((seller) => [seller.id, seller]));
  const dishes = new Map(getDishes().map((dish) => [dish.id, dish]));
  const seller = sellers.get(order.sellerId);
  const items = [];
  const skipped = [];
  for (const item of order.items || []) {
    const dish = dishes.get(item.dishId);
    if (!seller || seller.status !== "verified" || seller.online !== true ||
        !dish || dish.sellerId !== order.sellerId || dish.available === false || Number(dish.stock) <= 0) {
      skipped.push(item.name || "A dish");
      continue;
    }
    items.push({
      dishId: dish.id,
      sellerId: seller.id,
      societyId: seller.societyId,
      name: dish.name,
      unit: Number(item.unit),
      qty: Number(item.qty),
      options: item.options || [],
      note: item.note || "",
    });
  }
  return { items, skipped };
}

export function updateOrderStatus(orderId, status) {
  const orders = getOrders();
  const index = orders.findIndex((order) => order.id === orderId);
  if (index < 0) throw new Error("That order could not be found.");
  const allowedNextStatus = {
    Placed: ["Preparing"],
    Preparing: ["Ready", "Packed and Ready"],
    Ready: ["Delivered"],
    "Packed and Ready": ["Delivered", "Delivered and Paid", "Cash received and delivered"],
  };
  if (!allowedNextStatus[orders[index].status]?.includes(status)) {
    throw new Error("That order can't move to the selected status.");
  }
  const updatedOrder = {
    ...orders[index],
    status,
    ...(status === "Delivered" || DELIVERED_STATUSES.has(status) ? { paymentConfirmed: true } : {}),
  };
  orders[index] = updatedOrder;
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  return updatedOrder;
}

export function rejectOrder(orderId, sellerId) {
  const orders = getOrders();
  const index = orders.findIndex(
    (order) => order.id === orderId && order.sellerId === sellerId,
  );
  if (index < 0) throw new Error("That order could not be found.");
  if (orders[index].status !== "Placed") {
    throw new Error("Only newly placed orders can be rejected.");
  }

  const dishes = getDishes();
  const restocked = dishes.map((dish) => {
    if (dish.sellerId !== sellerId) return dish;
    const quantity = (orders[index].items || [])
      .filter((item) => item.dishId === dish.id)
      .reduce((total, item) => total + Number(item.qty || 0), 0);
    return quantity ? { ...dish, stock: Number(dish.stock) + quantity } : dish;
  });
  const rejectedOrder = { ...orders[index], status: "Rejected" };
  orders[index] = rejectedOrder;
  saveDishes(restocked);
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch (error) {
    saveDishes(dishes);
    throw error;
  }
  return rejectedOrder;
}

export function getPolls(societyId) {
  return filterToSociety(readList(POLLS_KEY, "poll"), societyId, "poll");
}

export function createPoll(poll) {
  const polls = getPolls();
  const options = (poll.options || [])
    .map((option) => ({ id: option.id || crypto.randomUUID(), label: option.label.trim() }))
    .filter((option) => option.label);
  if (options.length < 2) {
    throw new Error("A poll needs at least two non-empty options.");
  }
  const newPoll = {
    id: crypto.randomUUID(),
    question: poll.question.trim(),
    tag: poll.tag,
    options,
    votes: {},
    authorId: poll.authorId,
    societyId: poll.societyId || getSocietyIdForUser(getUserById(poll.authorId)),
    authorRole: poll.authorRole,
    authorLabel: poll.authorLabel,
    endsAt: poll.endsAt || null,
    closed: false,
    createdAt: Date.now(),
  };
  localStorage.setItem(POLLS_KEY, JSON.stringify([newPoll, ...polls]));
  return newPoll;
}

export function votePoll(pollId, userId, optionId) {
  const polls = getPolls();
  const index = polls.findIndex((poll) => poll.id === pollId);
  if (index < 0) return false;

  const poll = polls[index];
  if (
    poll.closed ||
    (poll.endsAt && Date.now() >= Number(poll.endsAt)) ||
    Object.hasOwn(poll.votes || {}, userId) ||
    !poll.options.some((option) => option.id === optionId)
  ) {
    return false;
  }

  const updatedPoll = {
    ...poll,
    votes: { ...(poll.votes || {}), [userId]: optionId },
  };
  polls[index] = updatedPoll;
  localStorage.setItem(POLLS_KEY, JSON.stringify(polls));
  return updatedPoll;
}

export function closePoll(pollId, userId) {
  const polls = getPolls();
  const index = polls.findIndex((poll) => poll.id === pollId);
  if (index < 0 || polls[index].authorId !== userId || polls[index].closed) return false;

  const updatedPoll = { ...polls[index], closed: true };
  polls[index] = updatedPoll;
  localStorage.setItem(POLLS_KEY, JSON.stringify(polls));
  return updatedPoll;
}

export function deletePoll(pollId, societyId, adminId) {
  const polls = getPolls();
  const poll = polls.find((item) => item.id === pollId);
  if (!poll || poll.societyId !== societyId) throw new Error("That poll could not be found in this society.");
  const society = getSociety(societyId);
  if (!society || society.adminId !== adminId) throw new Error("Only this society's admin can delete polls.");
  const updated = polls.filter((item) => item.id !== pollId);
  localStorage.setItem(POLLS_KEY, JSON.stringify(updated));
  return poll;
}
