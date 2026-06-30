import { Router, type RequestHandler } from "express";
import type { Server } from "socket.io";
import { login, logout, me, requireAuth, type AuthedRequest } from "../controllers/auth.js";
import { storage } from "../services/storage.js";
import { whatsappService } from "../services/whatsappService.js";
import { updateOrderStatus } from "../services/orderService.js";
import type { OrderStatus } from "../types/domain.js";

const validStatuses: OrderStatus[] = ["pending", "accepted", "rejected", "preparing", "out_for_delivery", "finished"];
const asyncRoute =
  (handler: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);

export function createApiRouter(io: Server) {
  const router = Router();

  router.post("/login", login);
  router.post("/logout", logout);
  router.get("/keepalive", async (_req, res) => {
    const settings = await storage.getSettings();
    const whatsapp = whatsappService.getStatus();
    res.json({
      ok: true,
      storeOpen: settings.storeOpen,
      whatsappConnected: whatsapp.connected,
      timestamp: new Date().toISOString()
    });
  });

  router.use(requireAuth);

  router.get("/me", me);

  router.get("/status", async (_req, res) => {
    const settings = await storage.getSettings();
    const orders = await storage.getOrders();
    const today = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter((order) => order.createdAt.startsWith(today));
    res.json({
      storeOpen: settings.storeOpen,
      whatsapp: whatsappService.getStatus(),
      pendingOrders: orders.filter((order) => order.status === "pending").length,
      finishedOrders: orders.filter((order) => order.status === "finished").length,
      totalSoldToday: todayOrders
        .filter((order) => order.status !== "rejected")
        .reduce((sum, order) => sum + order.total, 0)
    });
  });

  router.post("/store/open", async (_req, res) => {
    const settings = await storage.updateSettings({ storeOpen: true });
    io.emit("store:update", settings);
    io.emit("settings:update", settings);
    res.json(settings);
  });

  router.post("/store/close", async (_req, res) => {
    const settings = await storage.updateSettings({ storeOpen: false });
    io.emit("store:update", settings);
    io.emit("settings:update", settings);
    res.json(settings);
  });

  router.get("/whatsapp/status", (_req, res) => res.json(whatsappService.getStatus()));
  router.get("/whatsapp/qr", (_req, res) => res.json({ qr: whatsappService.getStatus().qr, qrDataUrl: whatsappService.getStatus().qrDataUrl }));
  router.post("/whatsapp/start", asyncRoute(async (_req, res) => res.json(await whatsappService.startBot())));
  router.post("/whatsapp/stop", asyncRoute(async (_req, res) => res.json(await whatsappService.stopBot())));
  router.post("/whatsapp/restart", asyncRoute(async (_req, res) => res.json(await whatsappService.restartBot())));
  router.post("/whatsapp/clear-session", asyncRoute(async (_req, res) => res.json(await whatsappService.clearSession())));

  router.get("/product", async (_req, res) => res.json(await storage.getProduct()));
  router.put("/product", async (req, res) => {
    const product = await storage.updateProduct(req.body);
    io.emit("settings:update", { product });
    res.json(product);
  });

  router.get("/flours", async (_req, res) => res.json(await storage.getFlours()));
  router.post("/flours", async (req, res) => {
    const flour = await storage.createFlour(req.body);
    io.emit("settings:update", { flours: await storage.getFlours() });
    res.status(201).json(flour);
  });
  router.put("/flours/:id", async (req, res) => {
    const flour = await storage.updateFlour(req.params.id, req.body);
    if (!flour) return res.status(404).json({ message: "Farinha não encontrada" });
    io.emit("settings:update", { flours: await storage.getFlours() });
    res.json(flour);
  });
  router.delete("/flours/:id", async (req, res) => {
    await storage.deleteFlour(req.params.id);
    io.emit("settings:update", { flours: await storage.getFlours() });
    res.json({ ok: true });
  });

  router.get("/additionals", async (_req, res) => res.json(await storage.getAdditionals()));
  router.post("/additionals", async (req, res) => {
    const additional = await storage.createAdditional(req.body);
    io.emit("settings:update", { additionals: await storage.getAdditionals() });
    res.status(201).json(additional);
  });
  router.put("/additionals/:id", async (req, res) => {
    const additional = await storage.updateAdditional(req.params.id, req.body);
    if (!additional) return res.status(404).json({ message: "Adicional não encontrado" });
    io.emit("settings:update", { additionals: await storage.getAdditionals() });
    res.json(additional);
  });
  router.delete("/additionals/:id", async (req, res) => {
    await storage.deleteAdditional(req.params.id);
    io.emit("settings:update", { additionals: await storage.getAdditionals() });
    res.json({ ok: true });
  });

  router.get("/settings", async (_req, res) => res.json(await storage.getSettings()));
  router.put("/settings", async (req, res) => {
    const settings = await storage.updateSettings(req.body);
    io.emit("settings:update", settings);
    io.emit("store:update", settings);
    res.json(settings);
  });

  router.get("/orders", async (_req, res) => res.json(await storage.getOrders()));
  router.get("/orders/:id", async (req, res) => {
    const order = await storage.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: "Pedido não encontrado" });
    res.json(order);
  });
  router.put("/orders/:id/status", async (req, res) => {
    const status = req.body?.status;
    if (!validStatuses.includes(status)) return res.status(400).json({ message: "Status inválido" });
    const order = await updateOrderStatus(req.params.id, status, io);
    if (!order) return res.status(404).json({ message: "Pedido não encontrado" });
    res.json(order);
  });
  router.delete("/orders/:id", async (req, res) => {
    await storage.deleteOrder(req.params.id);
    io.emit("order:update", { id: req.params.id, deleted: true });
    res.json({ ok: true });
  });

  return router;
}
