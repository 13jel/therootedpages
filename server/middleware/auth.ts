import { Response, NextFunction } from "express";
import { supabaseAdmin } from "../supabaseClient.js";
import { AuthRequest } from "../types.js";

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Ingen token" });

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user)
    return res.status(401).json({ error: "Ogiltig token" });

  req.user = data.user;
  req.token = token;
  next();
}

export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", req.user!.id)
    .single();

  if (error || profile?.role !== "admin") {
    return res.status(403).json({ error: "Kräver adminbehörighet" });
  }
  next();
}
