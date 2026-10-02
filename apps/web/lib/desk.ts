"use client";

export type Chat = {
  id: string;
  title: string;
  hypothesis: string;
  createdAt: string;
  runId?: string;
  conviction: number;
  sources: string[];
  brokerage?: string;
};

export type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
};

export type Brokerage = {
  id: string;
  name: string;
  status: "linked" | "pending";
};

export type Safety = {
  confirmLive: boolean;
  killSwitch: boolean;
  maxNotional: string;
};

const CHATS = "molecule.desk.chats";
const PROFILE = "molecule.desk.profile";
const BROKERS = "molecule.desk.brokers";
const SAFETY = "molecule.desk.safety";

export type DeskPlan = {
  plan: "free" | "pro";
  cycle: "monthly" | "yearly";
  renewsAt?: string;
};

const PLAN = "molecule.desk.plan";
const BOOK = "molecule.desk.book";
const HIDDEN = "molecule.desk.hidden";
const SESSION = "molecule.desk.session";

export const ADMIN = {
  email: "admin@molecule.ai",
  password: "MoleculeDesk-1",
  firstName: "Molecule",
  lastName: "Admin",
  role: "admin" as const,
};

export type Session = {
  email: string;
  role: "admin";
  signedInAt: string;
};

export type Sleeve = {
  runId: string;
  title: string;
  ticker: string;
  hypothesis: string;
  weight: number;
  addedAt: string;
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadChats(): Chat[] {
  return read<Chat[]>(CHATS, []);
}

export function saveChats(chats: Chat[]) {
  write(CHATS, chats);
}

export function upsertChat(chat: Chat) {
  const next = [chat, ...loadChats().filter((c) => c.id !== chat.id)];
  saveChats(next);
  return next;
}

export function titleFromHypothesis(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 42) return cleaned || "Untitled";
  return cleaned.slice(0, 42).trim() + "…";
}

export function loadProfile(): Profile {
  return read<Profile>(PROFILE, {
    firstName: "",
    lastName: "",
    email: "",
  });
}

export function saveProfile(profile: Profile) {
  write(PROFILE, profile);
}

export function loadBrokers(): Brokerage[] {
  return read<Brokerage[]>(BROKERS, []);
}

export function saveBrokers(list: Brokerage[]) {
  write(BROKERS, list);
}

export function loadSafety(): Safety {
  return read<Safety>(SAFETY, {
    confirmLive: true,
    killSwitch: false,
    maxNotional: "100000",
  });
}

export function saveSafety(value: Safety) {
  write(SAFETY, value);
}

export function loadPlan(): DeskPlan {
  return read<DeskPlan>(PLAN, { plan: "free", cycle: "monthly" });
}

export function savePlan(value: DeskPlan) {
  write(PLAN, value);
}

export function loadBook(): Sleeve[] {
  return read<Sleeve[]>(BOOK, []);
}

export function inBook(runId: string) {
  return loadBook().some((p) => p.runId === runId);
}

export function addToBook(sleeve: Omit<Sleeve, "weight" | "addedAt"> & { weight?: number }) {
  const current = loadBook();
  if (current.some((p) => p.runId === sleeve.runId)) return current;
  const next = [
    ...current,
    { ...sleeve, weight: sleeve.weight ?? 1, addedAt: new Date().toISOString() },
  ];
  const share = 100 / next.length;
  const balanced = next.map((s) => ({ ...s, weight: Math.round(share * 10) / 10 }));
  write(BOOK, balanced);
  return balanced;
}

export function removeFromBook(runId: string) {
  const next = loadBook().filter((p) => p.runId !== runId);
  write(BOOK, next);
  return next;
}

export function setWeight(runId: string, weight: number) {
  const nextWeight = Number.isFinite(weight) ? Math.max(0, weight) : 0;
  const next = loadBook().map((p) => (p.runId === runId ? { ...p, weight: nextWeight } : p));
  write(BOOK, next);
  return next;
}

export function loadHidden(): string[] {
  return read<string[]>(HIDDEN, []);
}

export function hideStrategy(runId: string) {
  const hidden = [...new Set([...loadHidden(), runId])];
  write(HIDDEN, hidden);
  removeFromBook(runId);
  return hidden;
}

export function signOutLocal() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CHATS);
  window.localStorage.removeItem(PROFILE);
  window.localStorage.removeItem(BROKERS);
  window.localStorage.removeItem(SAFETY);
  window.localStorage.removeItem(PLAN);
  window.localStorage.removeItem(BOOK);
  window.localStorage.removeItem(HIDDEN);
  window.localStorage.removeItem(SESSION);
  window.localStorage.removeItem("molecule.desk.2fa");
}

export function loadSession(): Session | null {
  return read<Session | null>(SESSION, null);
}

export function signIn(email: string, password: string): Session | null {
  const ok =
    email.trim().toLowerCase() === ADMIN.email && password === ADMIN.password;
  if (!ok) return null;
  const session: Session = {
    email: ADMIN.email,
    role: "admin",
    signedInAt: new Date().toISOString(),
  };
  write(SESSION, session);
  const profile = loadProfile();
  if (!profile.email) {
    saveProfile({
      firstName: ADMIN.firstName,
      lastName: ADMIN.lastName,
      email: ADMIN.email,
    });
  }
  return session;
}
