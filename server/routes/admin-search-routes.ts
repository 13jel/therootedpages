import { Router, Response, NextFunction } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { AuthRequest } from "../types.js";
import { fullReindex } from "../searchSync.js";

const router = Router();

router.post(
  "/reindex",
  requireAuth,
  requireAdmin,
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const count = await fullReindex();
      res.json({ indexed: count });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
