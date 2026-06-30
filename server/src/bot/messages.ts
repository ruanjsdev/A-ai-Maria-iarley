import type { Additional, Flour, Order, Product, Settings } from "../types/domain.js";

export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function mainMenu(settings: Settings) {
  return `🥤 Olá! Bem-vindo ao ${settings.storeName}

Nosso açaí é vendido por litro/saco.

1️⃣ Fazer pedido
2️⃣ Ver valor do litro
3️⃣ Falar com atendente`;
}

export function quantityMessage(product: Product) {
  return `🥤 Quantos ${product.unit}s de açaí você deseja?

Quantidade mínima: ${product.minQuantity}

Exemplo:
1
2
3
5`;
}

export function flourMessage(flours: Flour[]) {
  const rows = flours.map((flour, index) => {
    const extra = flour.extraPrice > 0 ? ` +${money(flour.extraPrice)}` : "";
    return `${index + 1}️⃣ ${flour.name}${extra}`;
  });
  return `🌾 Escolha a farinha:

${rows.join("\n")}`;
}

export function additionalMessage(additionals: Additional[]) {
  const rows = additionals.map((item, index) => `${index + 1}️⃣ ${item.name} - ${money(item.price)}`);
  rows.push(`${additionals.length + 1}️⃣ Não quero adicional`);
  return `🍌 Deseja adicionais?

${rows.join("\n")}

Pode escolher mais de um, separado por vírgula.
Exemplo: 1, 2, 4`;
}

export function deliveryMessage() {
  return `🚚 Como deseja receber?

1️⃣ Entrega
2️⃣ Retirada no local`;
}

export function addressMessage() {
  return `📍 Envie seu endereço completo:

Rua:
Número:
Bairro:
Referência:`;
}

export function paymentMessage() {
  return `💳 Forma de pagamento:

1️⃣ Pix
2️⃣ Dinheiro
3️⃣ Cartão`;
}

export function changeMessage() {
  return `💵 Precisa de troco? Se sim, informe para quanto.
Exemplo: troco para 50

Se não precisar, digite: não`;
}

export function orderSummary(order: Omit<Order, "id" | "number" | "createdAt" | "status">, settings: Settings) {
  const additionals = order.additionals.length
    ? order.additionals.map((item) => `${item.name} (${money(item.price)})`).join(", ")
    : "Nenhum";
  const payment = order.paymentMethod === "pix" ? "Pix" : order.paymentMethod === "cash" ? "Dinheiro" : "Cartão";
  return `✅ Confira seu pedido:

🥤 Açaí: ${order.quantity} ${order.unit}
💰 Valor do litro/saco: ${money(order.productPrice)}
🌾 Farinha: ${order.flour.name}
🍌 Adicionais: ${additionals}
🚚 Tipo: ${order.deliveryType === "delivery" ? "Entrega" : "Retirada"}
${order.address ? `📍 Endereço: ${order.address}\n` : ""}💳 Pagamento: ${payment}
${order.paymentMethod === "pix" ? `🔑 Pix: ${settings.pixKey}\n` : ""}${order.changeFor ? `💵 Troco: ${order.changeFor}\n` : ""}
Subtotal: ${money(order.subtotal)}
Entrega: ${money(order.deliveryFee)}
Total: ${money(order.total)}

1️⃣ Confirmar pedido
2️⃣ Alterar pedido
3️⃣ Cancelar`;
}
