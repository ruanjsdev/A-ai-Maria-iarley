# AcaiZap Bot Panel

MVP full-stack para atendimento de loja de açaí por litro/saco no WhatsApp, com bot Baileys, painel web responsivo, pedidos em tempo real via Socket.IO e persistência inicial em JSON.

O cliente faz todo o pedido dentro do WhatsApp por menus numéricos. O dono gerencia loja, QR Code, produto, farinhas, adicionais, configurações e pedidos pelo painel.

## Stack

- Node.js + TypeScript
- Express + Socket.IO
- Baileys para WhatsApp
- React + Vite
- Storage JSON local, com camada preparada para trocar por Supabase/Postgres depois

## Instalação

Use Node.js 20 ou superior. As versões atuais corrigidas do Baileys exigem Node 20+.

```bash
npm install
```

## Rodar em desenvolvimento

Crie os arquivos de ambiente se quiser customizar:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Suba backend e frontend juntos:

```bash
npm run dev
```

URLs padrão:

- Painel: `http://localhost:5173`
- API: `http://localhost:3001`

Login de desenvolvimento:

- Email: `admin@acai.local`
- Senha: `admin123`

## Rodar produção local

```bash
npm run build
npm start
```

O backend serve o painel buildado em produção.

## Variáveis de ambiente

Backend:

- `PORT`: porta HTTP. No Render use a porta fornecida por `process.env.PORT`.
- `ADMIN_EMAIL`: email do dono.
- `ADMIN_PASSWORD`: senha do dono.
- `JWT_SECRET`: segredo para assinar token.
- `CORS_ORIGIN`: origem do painel em desenvolvimento.
- `DATA_DIR`: pasta dos arquivos JSON.
- `AUTH_DIR`: pasta da sessão Baileys.
- `AUTO_START_BOT`: use `false` se não quiser iniciar o bot ao subir.

Frontend:

- `VITE_API_URL`: URL da API em desenvolvimento.
- `VITE_SOCKET_URL`: URL do Socket.IO em desenvolvimento.

## Conectar WhatsApp

1. Entre no painel.
2. Abra a aba WhatsApp.
3. Clique em Iniciar ou Reiniciar.
4. Escaneie o QR Code com o WhatsApp da loja.

O QR aparece quando o Baileys solicitar nova autenticação. No MVP não há promessa de sessão eterna; se cair, conecte de novo.

## Como usar

No painel:

- Abra ou feche a loja.
- Configure preço do litro/saco, quantidade mínima e unidade.
- Cadastre farinhas e adicionais.
- Edite mensagens automáticas.
- Acompanhe pedidos em tempo real.
- Mude status do pedido para avisar o cliente automaticamente pelo WhatsApp.

No WhatsApp, o cliente pode digitar `oi`, `olá` ou `menu` para começar. Também existem os comandos `cancelar`, `atendente` e `voltar`.

## Render Free

Configuração sugerida:

- Root Directory: raiz do repositório
- Node: `20` ou superior
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment: configure `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`, `AUTH_DIR`, `DATA_DIR`

Rota de keep alive:

```text
https://URL_DO_RENDER/api/keepalive
```

O painel faz polling leve quando a loja está aberta e o painel está aberto. Para reduzir sono do Render Free, você também pode configurar um cron externo gratuito, como cron-job.org, chamando essa rota a cada 10 minutos enquanto quiser manter o serviço acordado.

## Limitações do MVP gratuito

- JSON local pode ser perdido em redeploy/restart no Render Free.
- Render Free pode dormir.
- O WhatsApp pode pedir QR Code novamente.
- Baileys não é API oficial da Meta.
- Não há múltiplos atendentes nem relatórios avançados ainda.

## Futuras melhorias

- Supabase/Postgres
- PWA instalável
- Enquetes no WhatsApp como opção futura
- Relatórios
- Impressão
- Taxa por bairro
- Múltiplos atendentes
# A-ai-Maria-iarley
