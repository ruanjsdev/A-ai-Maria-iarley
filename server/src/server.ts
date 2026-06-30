import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { createApiRouter } from "./routes/api.js";
import { whatsappService } from "./services/whatsappService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || true,
      credentials: true
    }
  });

  whatsappService.bind(io);

  app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", createApiRouter(io));
  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    res.status(500).json({ message: error.message || "Erro interno" });
  });

  const clientDist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"), (error) => {
      if (error) res.status(404).json({ message: "Painel ainda não foi buildado" });
    });
  });

  return { app, httpServer, io };
}
