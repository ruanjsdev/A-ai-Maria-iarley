import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Bot, Check, LogOut, MessageCircle, Package, Plus, Power, RefreshCw, Save, Settings as SettingsIcon, Trash2, Wifi } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api, getToken, money, setToken } from "./services/api";
import type { Additional, Flour, Order, OrderStatus, Product, Settings, WhatsappStatus } from "./services/types";
import { StatusPill } from "./components/StatusPill";
import { Toast } from "./components/Toast";

type Tab = "dashboard" | "whatsapp" | "product" | "flours" | "additionals" | "settings" | "orders";

const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pendente",
  accepted: "Aceito",
  rejected: "Recusado",
  preparing: "Em preparo",
  out_for_delivery: "Saiu",
  finished: "Finalizado"
};

function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("admin@acai.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const data = await api<{ token: string }>("/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setToken(data.token);
      onLogin();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="loginShell">
      <section className="loginPanel">
        <div className="brandMark">AZ</div>
        <h1>AcaiZap Bot Panel</h1>
        <p>Atendimento de açaí por litro/saco no WhatsApp.</p>
        <form onSubmit={submit} className="formStack">
          <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <strong className="error">{error}</strong>}
          <button className="primaryButton" type="submit"><Check size={18} /> Entrar</button>
        </form>
      </section>
    </main>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [tab, setTab] = useState<Tab>("dashboard");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [flours, setFlours] = useState<Flour[]>([]);
  const [additionals, setAdditionals] = useState<Additional[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [whatsapp, setWhatsapp] = useState<WhatsappStatus>({ state: "stopped", connected: false, qr: null, qrDataUrl: null });
  const [logs, setLogs] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      pending: orders.filter((order) => order.status === "pending").length,
      finished: orders.filter((order) => order.status === "finished").length,
      totalToday: orders.filter((order) => order.createdAt.startsWith(today) && order.status !== "rejected").reduce((sum, order) => sum + order.total, 0)
    };
  }, [orders]);

  async function loadAll() {
    const [settingsData, productData, flourData, additionalData, orderData, whatsappData] = await Promise.all([
      api<Settings>("/settings"),
      api<Product>("/product"),
      api<Flour[]>("/flours"),
      api<Additional[]>("/additionals"),
      api<Order[]>("/orders"),
      api<WhatsappStatus>("/whatsapp/status")
    ]);
    setSettings(settingsData);
    setProduct(productData);
    setFlours(flourData);
    setAdditionals(additionalData);
    setOrders(orderData);
    setWhatsapp(whatsappData);
  }

  async function action<T>(fn: () => Promise<T>, success: string) {
    setLoading(true);
    try {
      const result = await fn();
      setToast(success);
      setTimeout(() => setToast(""), 2800);
      return result;
    } catch (error) {
      setToast((error as Error).message);
      setTimeout(() => setToast(""), 4800);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authed) return;
    loadAll().catch((error) => {
      if ((error as Error).message.includes("autentic")) {
        setToken(null);
        setAuthed(false);
      }
    });

    const socket: Socket = io(socketUrl, { transports: ["websocket", "polling"] });
    socket.on("status:update", setWhatsapp);
    socket.on("qr:update", setWhatsapp);
    socket.on("store:update", (next: Settings) => setSettings(next));
    socket.on("settings:update", () => void loadAll());
    socket.on("order:new", (order: Order) => setOrders((current) => [order, ...current]));
    socket.on("order:update", (order: Order & { deleted?: boolean }) => {
      setOrders((current) => order.deleted ? current.filter((item) => item.id !== order.id) : current.map((item) => item.id === order.id ? order : item));
    });
    socket.on("bot:log", (log: string) => setLogs((current) => [log, ...current].slice(0, 30)));

    const keepAlive = window.setInterval(() => {
      if (settings?.storeOpen) void api("/keepalive").catch(() => undefined);
    }, 10 * 60 * 1000);

    return () => {
      socket.disconnect();
      window.clearInterval(keepAlive);
    };
  }, [authed, settings?.storeOpen]);

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;
  if (!settings || !product) return <main className="loading">Carregando painel...</main>;

  const nav: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Início" },
    { id: "whatsapp", label: "WhatsApp" },
    { id: "orders", label: "Pedidos" },
    { id: "product", label: "Produto" },
    { id: "flours", label: "Farinhas" },
    { id: "additionals", label: "Adicionais" },
    { id: "settings", label: "Config" }
  ];

  return (
    <main className="appShell">
      <Toast message={toast} />
      <header className="topbar">
        <div>
          <span className="eyebrow">AcaiZap</span>
          <h1>{settings.storeName}</h1>
        </div>
        <button className="iconButton" title="Sair" onClick={() => { setToken(null); setAuthed(false); }}><LogOut size={18} /></button>
      </header>

      <nav className="tabs">
        {nav.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </nav>

      {tab === "dashboard" && (
        <section className="grid">
          <Metric title="Loja" value={settings.storeOpen ? "Aberta" : "Fechada"} tone={settings.storeOpen ? "green" : "red"} />
          <Metric title="WhatsApp" value={whatsapp.connected ? "Conectado" : whatsapp.state} tone={whatsapp.connected ? "green" : "red"} />
          <Metric title="Bot" value="Online" tone="green" />
          <Metric title="Pendentes" value={String(stats.pending)} tone="orange" />
          <Metric title="Finalizados" value={String(stats.finished)} tone="purple" />
          <Metric title="Vendido hoje" value={money(stats.totalToday)} tone="green" />
          <div className="panel wide">
            <div className="buttonGrid">
              <button disabled={loading} onClick={() => action(async () => setSettings(await api<Settings>("/store/open", { method: "POST" })), "Loja aberta")}><Power size={18} /> Abrir loja</button>
              <button disabled={loading} onClick={() => action(async () => setSettings(await api<Settings>("/store/close", { method: "POST" })), "Loja fechada")}><Power size={18} /> Fechar loja</button>
              <button disabled={loading} onClick={() => action(async () => setWhatsapp(await api<WhatsappStatus>("/whatsapp/restart", { method: "POST" })), "Bot reiniciado")}><RefreshCw size={18} /> Reiniciar bot</button>
              <button disabled={loading} onClick={() => { setTab("whatsapp"); void action(async () => setWhatsapp(await api<WhatsappStatus>("/whatsapp/start", { method: "POST" })), "WhatsApp iniciado"); }}><Wifi size={18} /> Conectar WhatsApp</button>
            </div>
          </div>
        </section>
      )}

      {tab === "whatsapp" && (
        <section className="grid">
          <div className="panel wide">
            <div className="sectionHead"><h2>WhatsApp</h2><StatusPill active={whatsapp.connected} label={whatsapp.connected ? "Conectado" : whatsapp.state} /></div>
            <div className="qrBox">
              {whatsapp.qrDataUrl ? <img src={whatsapp.qrDataUrl} alt="QR Code do WhatsApp" /> : whatsapp.qr ? <QRCodeSVG value={whatsapp.qr} size={220} /> : <MessageCircle size={80} />}
            </div>
            <div className="buttonGrid">
              <button onClick={() => action(async () => setWhatsapp(await api<WhatsappStatus>("/whatsapp/start", { method: "POST" })), "Bot iniciado")}><Bot size={18} /> Iniciar</button>
              <button onClick={() => action(async () => setWhatsapp(await api<WhatsappStatus>("/whatsapp/stop", { method: "POST" })), "Bot parado")}><Power size={18} /> Parar</button>
              <button onClick={() => action(async () => setWhatsapp(await api<WhatsappStatus>("/whatsapp/restart", { method: "POST" })), "Bot reiniciado")}><RefreshCw size={18} /> Reiniciar</button>
              <button className="danger" onClick={() => action(async () => setWhatsapp(await api<WhatsappStatus>("/whatsapp/clear-session", { method: "POST" })), "Sessão limpa")}><Trash2 size={18} /> Limpar sessão</button>
            </div>
          </div>
          <div className="panel wide">
            <h2>Logs</h2>
            <div className="logs">{logs.map((log, index) => <p key={`${log}-${index}`}>{log}</p>)}</div>
          </div>
        </section>
      )}

      {tab === "product" && <ProductForm product={product} onSave={(next) => action(async () => setProduct(await api<Product>("/product", { method: "PUT", body: JSON.stringify(next) })), "Produto salvo")} />}
      {tab === "flours" && <CrudList title="Farinhas" items={flours} priceKey="extraPrice" onCreate={() => action(async () => setFlours([...flours, await api<Flour>("/flours", { method: "POST", body: JSON.stringify({ name: "Nova farinha", extraPrice: 0, active: true }) })]), "Farinha criada")} onSave={(item) => action(async () => { await api(`/flours/${item.id}`, { method: "PUT", body: JSON.stringify(item) }); setFlours(await api<Flour[]>("/flours")); }, "Farinha salva")} onDelete={(id) => action(async () => { await api(`/flours/${id}`, { method: "DELETE" }); setFlours(await api<Flour[]>("/flours")); }, "Farinha excluída")} />}
      {tab === "additionals" && <CrudList title="Adicionais" items={additionals} priceKey="price" onCreate={() => action(async () => setAdditionals([...additionals, await api<Additional>("/additionals", { method: "POST", body: JSON.stringify({ name: "Novo adicional", price: 0, active: true }) })]), "Adicional criado")} onSave={(item) => action(async () => { await api(`/additionals/${item.id}`, { method: "PUT", body: JSON.stringify(item) }); setAdditionals(await api<Additional[]>("/additionals")); }, "Adicional salvo")} onDelete={(id) => action(async () => { await api(`/additionals/${id}`, { method: "DELETE" }); setAdditionals(await api<Additional[]>("/additionals")); }, "Adicional excluído")} />}
      {tab === "settings" && <SettingsForm settings={settings} onSave={(next) => action(async () => setSettings(await api<Settings>("/settings", { method: "PUT", body: JSON.stringify(next) })), "Configurações salvas")} />}
      {tab === "orders" && <Orders orders={orders} onStatus={(id, status) => action(async () => { await api(`/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }); setOrders(await api<Order[]>("/orders")); }, "Pedido atualizado")} onDelete={(id) => action(async () => { await api(`/orders/${id}`, { method: "DELETE" }); setOrders((current) => current.filter((order) => order.id !== id)); }, "Pedido excluído")} />}
    </main>
  );
}

function Metric({ title, value, tone }: { title: string; value: string; tone: string }) {
  return <div className={`metric ${tone}`}><span>{title}</span><strong>{value}</strong></div>;
}

function ProductForm({ product, onSave }: { product: Product; onSave: (product: Product) => Promise<unknown> }) {
  const [draft, setDraft] = useState(product);
  return (
    <section className="panel">
      <h2>Produto principal</h2>
      <div className="formGrid">
        <label>Nome<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
        <label>Unidade<select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value as Product["unit"] })}><option>litro/saco</option><option>litro</option><option>saco</option></select></label>
        <label>Preço<input type="number" min="0" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /></label>
        <label>Quantidade mínima<input type="number" min="1" value={draft.minQuantity} onChange={(e) => setDraft({ ...draft, minQuantity: Number(e.target.value) })} /></label>
        <label className="checkLine"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Produto ativo</label>
      </div>
      <button className="primaryButton" onClick={() => onSave(draft)}><Save size={18} /> Salvar produto</button>
    </section>
  );
}

function CrudList<T extends { id: string; name: string; active: boolean; order: number; price?: number; extraPrice?: number }>({ title, items, priceKey, onCreate, onSave, onDelete }: { title: string; items: T[]; priceKey: "price" | "extraPrice"; onCreate: () => void; onSave: (item: T) => void; onDelete: (id: string) => void }) {
  return (
    <section className="panel">
      <div className="sectionHead"><h2>{title}</h2><button onClick={onCreate}><Plus size={18} /> Novo</button></div>
      <div className="list">
        {items.map((item) => <CrudRow key={item.id} item={item} priceKey={priceKey} onSave={onSave} onDelete={onDelete} />)}
      </div>
    </section>
  );
}

function CrudRow<T extends { id: string; name: string; active: boolean; order: number; price?: number; extraPrice?: number }>({ item, priceKey, onSave, onDelete }: { item: T; priceKey: "price" | "extraPrice"; onSave: (item: T) => void; onDelete: (id: string) => void }) {
  const [draft, setDraft] = useState(item);
  return (
    <article className="rowCard">
      <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      <input type="number" min="0" step="0.01" value={Number(draft[priceKey] || 0)} onChange={(e) => setDraft({ ...draft, [priceKey]: Number(e.target.value) })} />
      <input type="number" min="1" value={draft.order} onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) })} />
      <label className="checkLine"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Ativo</label>
      <div className="rowActions">
        <button title="Salvar" onClick={() => onSave(draft)}><Save size={18} /></button>
        <button title="Excluir" className="danger" onClick={() => onDelete(draft.id)}><Trash2 size={18} /></button>
      </div>
    </article>
  );
}

function SettingsForm({ settings, onSave }: { settings: Settings; onSave: (settings: Settings) => Promise<unknown> }) {
  const [draft, setDraft] = useState(settings);
  const fields: (keyof Settings)[] = ["storeName", "storePhone", "deliveryFee", "pixKey", "storeAddress", "prepTime", "closedMessage", "acceptedMessage", "preparingMessage", "outForDeliveryMessage", "finishedMessage", "rejectedMessage", "attendantMessage"];
  return (
    <section className="panel">
      <h2>Configurações</h2>
      <div className="formGrid">
        {fields.map((field) => (
          <label key={field}>{labelFor(field)}
            {String(field).includes("Message") ? (
              <textarea value={String(draft[field])} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} />
            ) : (
              <input type={field === "deliveryFee" ? "number" : "text"} value={String(draft[field])} onChange={(e) => setDraft({ ...draft, [field]: field === "deliveryFee" ? Number(e.target.value) : e.target.value })} />
            )}
          </label>
        ))}
      </div>
      <button className="primaryButton" onClick={() => onSave(draft)}><SettingsIcon size={18} /> Salvar configurações</button>
    </section>
  );
}

function Orders({ orders, onStatus, onDelete }: { orders: Order[]; onStatus: (id: string, status: OrderStatus) => void; onDelete: (id: string) => void }) {
  return (
    <section className="orders">
      {orders.map((order) => (
        <article className="orderCard" key={order.id}>
          <div className="sectionHead">
            <div><h2>Pedido #{order.number}</h2><span>{new Date(order.createdAt).toLocaleString("pt-BR")}</span></div>
            <span className={`orderStatus ${order.status}`}>{statusLabels[order.status]}</span>
          </div>
          <div className="orderDetails">
            <p><strong>Cliente:</strong> {order.customerName} - {order.customerPhone}</p>
            <p><strong>Açaí:</strong> {order.quantity} {order.unit} a {money(order.productPrice)}</p>
            <p><strong>Farinha:</strong> {order.flour.name}</p>
            <p><strong>Adicionais:</strong> {order.additionals.length ? order.additionals.map((item) => item.name).join(", ") : "Nenhum"}</p>
            <p><strong>Tipo:</strong> {order.deliveryType === "delivery" ? "Entrega" : "Retirada"}</p>
            {order.address && <p><strong>Endereço:</strong> {order.address}</p>}
            <p><strong>Pagamento:</strong> {order.paymentMethod === "pix" ? "Pix" : order.paymentMethod === "cash" ? "Dinheiro" : "Cartão"} {order.changeFor ? `- ${order.changeFor}` : ""}</p>
            <p><strong>Total:</strong> {money(order.total)}</p>
          </div>
          <div className="statusButtons">
            <button onClick={() => onStatus(order.id, "accepted")}>Aceitar</button>
            <button onClick={() => onStatus(order.id, "rejected")}>Recusar</button>
            <button onClick={() => onStatus(order.id, "preparing")}>Em preparo</button>
            <button onClick={() => onStatus(order.id, "out_for_delivery")}>Saiu</button>
            <button onClick={() => onStatus(order.id, "finished")}>Finalizar</button>
            <button className="danger" onClick={() => onDelete(order.id)}>Excluir</button>
          </div>
        </article>
      ))}
      {!orders.length && <div className="empty"><Package size={48} /> Nenhum pedido ainda</div>}
    </section>
  );
}

function labelFor(field: keyof Settings) {
  const labels: Record<keyof Settings, string> = {
    storeName: "Nome da loja",
    storePhone: "Número da loja",
    storeOpen: "Loja aberta",
    deliveryFee: "Taxa de entrega",
    pixKey: "Chave Pix",
    storeAddress: "Endereço da loja",
    prepTime: "Tempo médio de preparo",
    closedMessage: "Mensagem de loja fechada",
    acceptedMessage: "Mensagem de pedido aceito",
    preparingMessage: "Mensagem de pedido em preparo",
    outForDeliveryMessage: "Mensagem saiu para entrega",
    finishedMessage: "Mensagem de pedido finalizado",
    rejectedMessage: "Mensagem de pedido recusado",
    attendantMessage: "Mensagem de atendente"
  };
  return labels[field];
}
