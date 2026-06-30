import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Additional, Flour, Order, OrderStatus, Product, Settings } from "../types/domain.js";
import { defaultAdditionals, defaultFlours, defaultOrders, defaultProduct, defaultSettings } from "./defaults.js";

type CollectionName = "settings" | "product" | "flours" | "additionals" | "orders";

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), "data");

async function ensureDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

async function readJson<T>(name: CollectionName, fallback: T): Promise<T> {
  await ensureDir();
  const file = path.join(dataDir, `${name}.json`);
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    await writeJson(name, fallback);
    return fallback;
  }
}

async function writeJson<T>(name: CollectionName, value: T): Promise<T> {
  await ensureDir();
  const file = path.join(dataDir, `${name}.json`);
  await fs.writeFile(file, JSON.stringify(value, null, 2));
  return value;
}

const money = (value: unknown) => Math.max(0, Number(value) || 0);
const intMin = (value: unknown, min: number) => Math.max(min, Math.floor(Number(value) || min));

class JsonStorageService {
  async getSettings() {
    return readJson<Settings>("settings", defaultSettings);
  }

  async updateSettings(input: Partial<Settings>) {
    const current = await this.getSettings();
    const next: Settings = {
      ...current,
      ...input,
      deliveryFee: money(input.deliveryFee ?? current.deliveryFee),
      storeOpen: Boolean(input.storeOpen ?? current.storeOpen)
    };
    return writeJson("settings", next);
  }

  async getProduct() {
    return readJson<Product>("product", defaultProduct);
  }

  async updateProduct(input: Partial<Product>) {
    const current = await this.getProduct();
    const next: Product = {
      ...current,
      ...input,
      price: money(input.price ?? current.price),
      minQuantity: intMin(input.minQuantity ?? current.minQuantity, 1),
      active: Boolean(input.active ?? current.active),
      unit: input.unit || current.unit
    };
    return writeJson("product", next);
  }

  async getFlours() {
    const flours = await readJson<Flour[]>("flours", defaultFlours);
    return flours.sort((a, b) => a.order - b.order);
  }

  async createFlour(input: Partial<Flour>) {
    const flours = await this.getFlours();
    const flour: Flour = {
      id: randomUUID(),
      name: String(input.name || "Nova farinha").trim(),
      extraPrice: money(input.extraPrice),
      active: input.active ?? true,
      order: intMin(input.order ?? flours.length + 1, 1)
    };
    return writeJson("flours", [...flours, flour]).then(() => flour);
  }

  async updateFlour(id: string, input: Partial<Flour>) {
    const flours = await this.getFlours();
    const next = flours.map((flour) =>
      flour.id === id
        ? {
            ...flour,
            ...input,
            name: input.name !== undefined ? String(input.name).trim() : flour.name,
            extraPrice: money(input.extraPrice ?? flour.extraPrice),
            active: Boolean(input.active ?? flour.active),
            order: intMin(input.order ?? flour.order, 1)
          }
        : flour
    );
    await writeJson("flours", next);
    return next.find((flour) => flour.id === id) ?? null;
  }

  async deleteFlour(id: string) {
    const flours = await this.getFlours();
    await writeJson("flours", flours.filter((flour) => flour.id !== id));
  }

  async getAdditionals() {
    const additionals = await readJson<Additional[]>("additionals", defaultAdditionals);
    return additionals.sort((a, b) => a.order - b.order);
  }

  async createAdditional(input: Partial<Additional>) {
    const additionals = await this.getAdditionals();
    const additional: Additional = {
      id: randomUUID(),
      name: String(input.name || "Novo adicional").trim(),
      price: money(input.price),
      active: input.active ?? true,
      order: intMin(input.order ?? additionals.length + 1, 1)
    };
    return writeJson("additionals", [...additionals, additional]).then(() => additional);
  }

  async updateAdditional(id: string, input: Partial<Additional>) {
    const additionals = await this.getAdditionals();
    const next = additionals.map((additional) =>
      additional.id === id
        ? {
            ...additional,
            ...input,
            name: input.name !== undefined ? String(input.name).trim() : additional.name,
            price: money(input.price ?? additional.price),
            active: Boolean(input.active ?? additional.active),
            order: intMin(input.order ?? additional.order, 1)
          }
        : additional
    );
    await writeJson("additionals", next);
    return next.find((additional) => additional.id === id) ?? null;
  }

  async deleteAdditional(id: string) {
    const additionals = await this.getAdditionals();
    await writeJson("additionals", additionals.filter((additional) => additional.id !== id));
  }

  async getOrders() {
    const orders = await readJson<Order[]>("orders", defaultOrders);
    return orders.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  async getOrderById(id: string) {
    const orders = await this.getOrders();
    return orders.find((order) => order.id === id) ?? null;
  }

  async createOrder(input: Omit<Order, "id" | "number" | "createdAt" | "status">) {
    const orders = await this.getOrders();
    const maxNumber = orders.reduce((max, order) => Math.max(max, order.number), 0);
    const order: Order = {
      ...input,
      id: randomUUID(),
      number: maxNumber + 1,
      createdAt: new Date().toISOString(),
      status: "pending",
      total: Math.max(0, input.total)
    };
    await writeJson("orders", [order, ...orders]);
    return order;
  }

  async updateOrderStatus(id: string, status: OrderStatus) {
    const orders = await this.getOrders();
    const index = orders.findIndex((order) => order.id === id);
    if (index === -1) return null;
    const updated: Order = { ...orders[index], status };
    const next = [...orders];
    next[index] = updated;
    await writeJson("orders", next);
    return updated;
  }

  async deleteOrder(id: string) {
    const orders = await this.getOrders();
    await writeJson("orders", orders.filter((order) => order.id !== id));
  }
}

export const storage = new JsonStorageService();
