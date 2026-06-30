import type { Additional, DeliveryType, Flour, PaymentMethod } from "../types/domain.js";

export type SessionStep =
  | "menu"
  | "quantity"
  | "flour"
  | "additionals"
  | "delivery"
  | "address"
  | "payment"
  | "change"
  | "confirm";

export interface CustomerSession {
  jid: string;
  step: SessionStep;
  customerName: string;
  quantity?: number;
  flour?: Flour;
  additionals: Additional[];
  deliveryType?: DeliveryType;
  address?: string;
  paymentMethod?: PaymentMethod;
  changeFor?: string;
}

const sessions = new Map<string, CustomerSession>();

export function getSession(jid: string, customerName = "Cliente") {
  const existing = sessions.get(jid);
  if (existing) return existing;
  const session: CustomerSession = { jid, customerName, step: "menu", additionals: [] };
  sessions.set(jid, session);
  return session;
}

export function resetSession(jid: string, customerName = "Cliente") {
  const session: CustomerSession = { jid, customerName, step: "menu", additionals: [] };
  sessions.set(jid, session);
  return session;
}

export function clearSession(jid: string) {
  sessions.delete(jid);
}
