import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const adminEmail = process.env.ADMIN_EMAIL || "admin@acai.local";
const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || "dev-secret-change-me";

export interface AuthedRequest extends Request {
  user?: { email: string };
}

export function login(req: Request, res: Response) {
  const { email, password } = req.body || {};
  if (email !== adminEmail || password !== adminPassword) {
    return res.status(401).json({ message: "Email ou senha inválidos" });
  }
  const token = jwt.sign({ email }, jwtSecret, { expiresIn: "7d" });
  return res.json({ token, user: { email } });
}

export function me(req: AuthedRequest, res: Response) {
  return res.json({ user: req.user });
}

export function logout(_req: Request, res: Response) {
  return res.json({ ok: true });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Não autenticado" });
  try {
    req.user = jwt.verify(token, jwtSecret) as { email: string };
    return next();
  } catch {
    return res.status(401).json({ message: "Sessão inválida" });
  }
}
