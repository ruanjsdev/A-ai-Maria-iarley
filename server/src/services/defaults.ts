import type { Additional, Flour, Product, Settings } from "../types/domain.js";

export const defaultSettings: Settings = {
  storeName: "Açai Maria",
  storePhone: "",
  storeOpen: false,
  deliveryFee: 3,
  pixKey: "pix@acai.local",
  storeAddress: "Informe o endereço da loja",
  prepTime: "30 a 45 minutos",
  closedMessage: "No momento estamos fechados. Digite menu mais tarde para fazer seu pedido.",
  acceptedMessage: "✅ Seu pedido foi aceito e já vai entrar em preparo.",
  preparingMessage: "🥤 Seu pedido já está em preparo.",
  outForDeliveryMessage: "🚚 Seu pedido saiu para entrega!",
  finishedMessage: "✅ Pedido finalizado. Obrigado pela preferência!",
  rejectedMessage: "❌ No momento não conseguimos atender seu pedido. Fale com um atendente para mais detalhes.",
  attendantMessage: "Um atendente foi avisado. Aguarde um instante, por favor."
};

export const defaultProduct: Product = {
  name: "Açaí por litro/saco",
  unit: "litro/saco",
  price: 15,
  minQuantity: 1,
  active: true
};

export const defaultFlours: Flour[] = [
  { id: "farinha-tapioca", name: "Farinha de tapioca", extraPrice: 0, active: true, order: 1 },
  { id: "farinha-agua", name: "Farinha d'água", extraPrice: 0, active: true, order: 2 },
  { id: "sem-farinha", name: "Sem farinha", extraPrice: 0, active: true, order: 3 }
];

export const defaultAdditionals: Additional[] = [
  { id: "banana", name: "Banana", price: 2, active: true, order: 1 },
  { id: "leite-po", name: "Leite em pó", price: 3, active: true, order: 2 },
  { id: "leite-condensado", name: "Leite condensado", price: 3, active: true, order: 3 },
  { id: "pacoca", name: "Paçoca", price: 2, active: true, order: 4 },
  { id: "granola", name: "Granola", price: 2, active: true, order: 5 }
];

export const defaultOrders = [];
