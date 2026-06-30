import fs from "node:fs/promises";
import path from "node:path";
import type { WASocket } from "@whiskeysockets/baileys";
import pino from "pino";
import type { Server } from "socket.io";
import QRCode from "qrcode";
import { handleIncomingMessage } from "../bot/flow.js";

type ConnectionState = "stopped" | "starting" | "qr" | "connected" | "disconnected";

class WhatsappService {
  private socket: WASocket | null = null;
  private io: Server | null = null;
  private qr: string | null = null;
  private qrDataUrl: string | null = null;
  private state: ConnectionState = "stopped";
  private authDir = path.resolve(process.env.AUTH_DIR || path.join(process.cwd(), "auth"));

  bind(io: Server) {
    this.io = io;
  }

  getStatus() {
    return {
      state: this.state,
      connected: this.state === "connected",
      qr: this.qr,
      qrDataUrl: this.qrDataUrl
    };
  }

  async startBot() {
    if (this.socket || this.state === "starting") return this.getStatus();
    this.state = "starting";
    this.emitStatus("Bot iniciado");

    if (!globalThis.crypto?.subtle) {
      this.state = "stopped";
      const message = "WhatsApp/Baileys precisa de Node.js 20 ou superior para gerar o QR Code.";
      this.emitStatus(message);
      throw new Error(message);
    }

    const {
      DisconnectReason,
      fetchLatestBaileysVersion,
      makeWASocket,
      makeCacheableSignalKeyStore,
      useMultiFileAuthState
    } = await import("@whiskeysockets/baileys");
    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
    const { version } = await fetchLatestBaileysVersion();
    const logger = pino({ level: process.env.BAILEYS_LOG_LEVEL || "silent" });

    const socket = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      logger,
      printQRInTerminal: false,
      browser: ["AcaiZap", "Chrome", "1.0.0"]
    });
    this.socket = socket;

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", async (update) => {
      if (update.qr) {
        this.qr = update.qr;
        this.qrDataUrl = await QRCode.toDataURL(update.qr);
        this.state = "qr";
        this.emitStatus("QR gerado");
        this.io?.emit("qr:update", this.getStatus());
      }

      if (update.connection === "open") {
        this.qr = null;
        this.qrDataUrl = null;
        this.state = "connected";
        this.emitStatus("WhatsApp conectado");
      }

      if (update.connection === "close") {
        const statusCode = (update.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
        this.socket = null;
        this.state = "disconnected";
        this.emitStatus("WhatsApp desconectado");
        if (statusCode !== DisconnectReason.loggedOut) {
          setTimeout(() => void this.startBot(), 2000);
        }
      }
    });

    socket.ev.on("messages.upsert", async ({ messages }) => {
      for (const message of messages) {
        if (message.key.fromMe) continue;
        if (this.io) await handleIncomingMessage(message, this.sendMessageToCustomer.bind(this), this.io);
      }
    });

    return this.getStatus();
  }

  async stopBot() {
    if (this.socket) {
      this.socket.end(undefined);
    }
    this.socket = null;
    this.qr = null;
    this.qrDataUrl = null;
    this.state = "stopped";
    this.emitStatus("Bot parado");
    return this.getStatus();
  }

  async restartBot() {
    if (this.socket) {
      this.socket.end(undefined);
      this.socket = null;
    }
    this.state = "stopped";
    return this.startBot();
  }

  async clearSession() {
    if (this.socket) {
      this.socket.end(undefined);
      this.socket = null;
    }
    await fs.rm(this.authDir, { recursive: true, force: true });
    this.qr = null;
    this.qrDataUrl = null;
    this.state = "stopped";
    this.emitStatus("Sessão do WhatsApp limpa");
    return this.getStatus();
  }

  async sendMessageToCustomer(jid: string, text: string) {
    if (!this.socket || this.state !== "connected") {
      this.io?.emit("bot:log", "Não foi possível enviar mensagem: WhatsApp desconectado");
      return false;
    }
    try {
      await this.socket.sendMessage(jid, { text });
      return true;
    } catch (error) {
      this.io?.emit("bot:log", `Erro ao enviar mensagem: ${(error as Error).message}`);
      return false;
    }
  }

  private emitStatus(log?: string) {
    const status = this.getStatus();
    this.io?.emit("status:update", status);
    if (log) this.io?.emit("bot:log", log);
  }
}

export const whatsappService = new WhatsappService();
