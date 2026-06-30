export type OrderStatus = "pending" | "accepted" | "rejected" | "preparing" | "out_for_delivery" | "finished";

export interface Settings {
  storeName: string;
  storePhone: string;
  storeOpen: boolean;
  deliveryFee: number;
  pixKey: string;
  storeAddress: string;
  prepTime: string;
  closedMessage: string;
  acceptedMessage: string;
  preparingMessage: string;
  outForDeliveryMessage: string;
  finishedMessage: string;
  rejectedMessage: string;
  attendantMessage: string;
}

export interface Product {
  name: string;
  unit: "litro/saco" | "litro" | "saco";
  price: number;
  minQuantity: number;
  active: boolean;
}

export interface Flour {
  id: string;
  name: string;
  extraPrice: number;
  active: boolean;
  order: number;
}

export interface Additional {
  id: string;
  name: string;
  price: number;
  active: boolean;
  order: number;
}

export interface Order {
  id: string;
  number: number;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerJid: string;
  status: OrderStatus;
  quantity: number;
  unit: string;
  productPrice: number;
  flour: { id: string; name: string; price: number };
  additionals: { id: string; name: string; price: number }[];
  deliveryType: "delivery" | "pickup";
  address?: string;
  paymentMethod: "pix" | "cash" | "card";
  changeFor?: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
}

export interface WhatsappStatus {
  state: string;
  connected: boolean;
  qr: string | null;
  qrDataUrl: string | null;
}
