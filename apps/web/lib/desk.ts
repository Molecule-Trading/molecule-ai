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
};

const PLAN = "molecule.desk.plan";
const PAPER = "molecule.desk.paper";

export type PaperPosition = {
  runId: string;
  title: string;
  ticker: string;
  hypothesis: string;
  deployedAt: string;
  ret?: number;
  sharpe?: number;
  pnl?: number;
  trades?: number;
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

export function loadPaper(): PaperPosition[] {
  return read<PaperPosition[]>(PAPER, []);
}

export function isPaper(runId: string) {
  return loadPaper().some((p) => p.runId === runId);
}

export function deployPaper(position: PaperPosition) {
  const next = [position, ...loadPaper().filter((p) => p.runId !== position.runId)];
  write(PAPER, next);
  return next;
}

export function stopPaper(runId: string) {
  const next = loadPaper().filter((p) => p.runId !== runId);
  write(PAPER, next);
  return next;
}

export function signOutLocal() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CHATS);
  window.localStorage.removeItem(PROFILE);
  window.localStorage.removeItem(BROKERS);
  window.localStorage.removeItem(SAFETY);
  window.localStorage.removeItem(PLAN);
  window.localStorage.removeItem(PAPER);
}
