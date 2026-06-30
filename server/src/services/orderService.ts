import type { Server } from "socket.io";
import type { OrderStatus } from "../types/domain.js";
import { storage } from "./storage.js";
import { whatsappService } from "./whatsappService.js";

const statusMessageKey: Record<OrderStatus, string | null> = {
  pending: null,
  accepted: "acceptedMessage",
  rejected: "rejectedMessage",
  preparing: "preparingMessage",
  out_for_delivery: "outForDeliveryMessage",
  finished: "finishedMessage"
};

export async function updateOrderStatus(id: string, status: OrderStatus, io?: Server) {
  const order = await storage.updateOrderStatus(id, status);
  if (!order) return null;
  io?.emit("order:update", order);

  const settings = await storage.getSettings();
  const key = statusMessageKey[status];
  if (key) {
    const text = settings[key as keyof typeof settings];
    if (typeof text === "string" && text.trim()) {
      await whatsappService.sendMessageToCustomer(order.customerJid, text);
    }
  }

  return order;
}
