import "dotenv/config";
import { createApp } from "./server.js";
import { whatsappService } from "./services/whatsappService.js";

const port = Number(process.env.PORT || 3001);
const autoStart = process.env.AUTO_START_BOT !== "false";

const { httpServer } = await createApp();

httpServer.listen(port, () => {
  console.log(`AcaiZap Bot Panel API rodando na porta ${port}`);
});

if (autoStart) {
  void whatsappService.startBot().catch((error) => {
    console.error("Falha ao iniciar bot:", error);
  });
}
