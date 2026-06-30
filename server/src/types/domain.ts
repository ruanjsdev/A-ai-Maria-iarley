export type OrderStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "preparing"
  | "out_for_delivery"
  | "finished";

export type DeliveryType = "delivery" | "pickup";
export type PaymentMethod = "pix" | "cash" | "card";

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

export interface OrderItem {
  id: string;
  name: string;
  price: number;
}

export interface Order {
  id: string;
  number: number;
  createdAt: string;
  customerJid: string;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  quantity: number;
  unit: string;
  productName: string;
  productPrice: number;
  flour: OrderItem;
  additionals: OrderItem[];
  deliveryType: DeliveryType;
  address?: string;
  paymentMethod: PaymentMethod;
  changeFor?: string;
  subtotal: number;
  flourExtra: number;
  additionalsTotal: number;
  deliveryFee: number;
  total: number;
}

export interface AppStatus {
  storeOpen: boolean;
  whatsappConnected: boolean;
  whatsappState: string;
  qr: string | null;
}
