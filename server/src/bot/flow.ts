import type { Server } from "socket.io";
import type { WAMessage } from "@whiskeysockets/baileys";
import { clearSession, getSession, resetSession } from "./session.js";
import {
  additionalMessage,
  addressMessage,
  changeMessage,
  deliveryMessage,
  flourMessage,
  mainMenu,
  money,
  orderSummary,
  paymentMessage,
  quantityMessage
} from "./messages.js";
import { storage } from "../services/storage.js";

type SendFn = (jid: string, text: string) => Promise<unknown>;

function textFromMessage(message: WAMessage) {
  const content = message.message;
  return (
    content?.conversation ||
    content?.extendedTextMessage?.text ||
    content?.imageMessage?.caption ||
    content?.videoMessage?.caption ||
    ""
  ).trim();
}

function phoneFromJid(jid: string) {
  return jid.split("@")[0];
}

function isGreeting(text: string) {
  return ["oi", "olá", "ola", "menu", "bom dia", "boa tarde", "boa noite"].includes(text.toLowerCase());
}

function buildDraft(session: ReturnType<typeof getSession>, settings: Awaited<ReturnType<typeof storage.getSettings>>, product: Awaited<ReturnType<typeof storage.getProduct>>) {
  const quantity = session.quantity || 0;
  const flour = session.flour!;
  const additionals = session.additionals || [];
  const subtotal = quantity * product.price;
  const flourExtra = flour.extraPrice;
  const additionalsTotal = additionals.reduce((sum, item) => sum + item.price, 0);
  const deliveryFee = session.deliveryType === "delivery" ? settings.deliveryFee : 0;
  const total = Math.max(0, subtotal + flourExtra + additionalsTotal + deliveryFee);

  return {
    customerJid: session.jid,
    customerName: session.customerName,
    customerPhone: phoneFromJid(session.jid),
    quantity,
    unit: product.unit,
    productName: product.name,
    productPrice: product.price,
    flour: { id: flour.id, name: flour.name, price: flour.extraPrice },
    additionals: additionals.map((item) => ({ id: item.id, name: item.name, price: item.price })),
    deliveryType: session.deliveryType!,
    address: session.address,
    paymentMethod: session.paymentMethod!,
    changeFor: session.changeFor,
    subtotal,
    flourExtra,
    additionalsTotal,
    deliveryFee,
    total
  };
}

export async function handleIncomingMessage(message: WAMessage, send: SendFn, io: Server) {
  const jid = message.key.remoteJid;
  if (!jid || jid.endsWith("@g.us") || jid === "status@broadcast") return;

  const text = textFromMessage(message);
  if (!text) return;

  const lower = text.toLowerCase();
  const customerName = message.pushName || "Cliente";
  const settings = await storage.getSettings();
  const product = await storage.getProduct();

  io.emit("bot:log", `Nova mensagem de ${phoneFromJid(jid)}: ${text}`);

  if (lower === "cancelar") {
    clearSession(jid);
    await send(jid, "Pedido cancelado. Digite “menu” quando quiser começar de novo.");
    return;
  }

  if (lower === "atendente") {
    await send(jid, settings.attendantMessage);
    return;
  }

  if (!settings.storeOpen) {
    await send(jid, settings.closedMessage);
    return;
  }

  if (!product.active) {
    await send(jid, "No momento o produto principal está indisponível.");
    return;
  }

  if (lower === "menu" || isGreeting(text)) {
    resetSession(jid, customerName);
    await send(jid, mainMenu(settings));
    return;
  }

  const session = getSession(jid, customerName);

  if (lower === "voltar") {
    resetSession(jid, customerName);
    await send(jid, mainMenu(settings));
    return;
  }

  if (session.step === "menu") {
    if (text === "1") {
      session.step = "quantity";
      await send(jid, quantityMessage(product));
      return;
    }
    if (text === "2") {
      await send(jid, `O valor do ${product.unit} é ${money(product.price)}.`);
      await send(jid, mainMenu(settings));
      return;
    }
    if (text === "3") {
      await send(jid, settings.attendantMessage);
      return;
    }
    await send(jid, mainMenu(settings));
    return;
  }

  if (session.step === "quantity") {
    const quantity = Number(text);
    if (!Number.isInteger(quantity) || quantity < product.minQuantity) {
      await send(jid, `Digite uma quantidade inteira maior ou igual a ${product.minQuantity}.`);
      return;
    }
    session.quantity = quantity;
    session.step = "flour";
    const flours = (await storage.getFlours()).filter((item) => item.active);
    await send(jid, flourMessage(flours));
    return;
  }

  if (session.step === "flour") {
    const flours = (await storage.getFlours()).filter((item) => item.active);
    const index = Number(text) - 1;
    if (!Number.isInteger(index) || !flours[index]) {
      await send(jid, "Escolha uma opção válida de farinha.");
      return;
    }
    session.flour = flours[index];
    session.step = "additionals";
    const additionals = (await storage.getAdditionals()).filter((item) => item.active);
    await send(jid, additionalMessage(additionals));
    return;
  }

  if (session.step === "additionals") {
    const additionals = (await storage.getAdditionals()).filter((item) => item.active);
    const noneOption = additionals.length + 1;
    const indexes = text.split(",").map((part) => Number(part.trim())).filter(Boolean);
    if (!indexes.length || indexes.some((index) => !Number.isInteger(index) || index < 1 || index > noneOption)) {
      await send(jid, "Digite opções válidas, separadas por vírgula.");
      return;
    }
    session.additionals = indexes.includes(noneOption)
      ? []
      : indexes.map((index) => additionals[index - 1]).filter(Boolean);
    session.step = "delivery";
    await send(jid, deliveryMessage());
    return;
  }

  if (session.step === "delivery") {
    if (text === "1") {
      session.deliveryType = "delivery";
      session.step = "address";
      await send(jid, addressMessage());
      return;
    }
    if (text === "2") {
      session.deliveryType = "pickup";
      session.step = "payment";
      await send(jid, paymentMessage());
      return;
    }
    await send(jid, "Escolha 1 para entrega ou 2 para retirada.");
    return;
  }

  if (session.step === "address") {
    session.address = text;
    session.step = "payment";
    await send(jid, paymentMessage());
    return;
  }

  if (session.step === "payment") {
    if (text === "1") session.paymentMethod = "pix";
    if (text === "2") session.paymentMethod = "cash";
    if (text === "3") session.paymentMethod = "card";
    if (!session.paymentMethod) {
      await send(jid, "Escolha uma forma de pagamento válida.");
      return;
    }
    if (session.paymentMethod === "cash") {
      session.step = "change";
      await send(jid, changeMessage());
      return;
    }
    session.step = "confirm";
    const draft = buildDraft(session, settings, product);
    await send(jid, orderSummary(draft, settings));
    return;
  }

  if (session.step === "change") {
    session.changeFor = lower === "não" || lower === "nao" ? undefined : text;
    session.step = "confirm";
    const draft = buildDraft(session, settings, product);
    await send(jid, orderSummary(draft, settings));
    return;
  }

  if (session.step === "confirm") {
    if (text === "1") {
      const draft = buildDraft(session, settings, product);
      const order = await storage.createOrder(draft);
      clearSession(jid);
      io.emit("order:new", order);
      io.emit("bot:log", `Pedido #${order.number} criado`);
      await send(jid, "✅ Pedido confirmado!\nSeu pedido foi enviado para a loja.\nAguarde a confirmação do atendimento 🥤");
      return;
    }
    if (text === "2") {
      resetSession(jid, customerName).step = "quantity";
      await send(jid, quantityMessage(product));
      return;
    }
    if (text === "3") {
      clearSession(jid);
      await send(jid, "Pedido cancelado. Digite “menu” quando quiser começar de novo.");
      return;
    }
    await send(jid, "Digite 1 para confirmar, 2 para alterar ou 3 para cancelar.");
  }
}
