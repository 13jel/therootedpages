import { Router, Request, Response, NextFunction } from "express";
import { getRates } from "../integrations/currencyAdapter.js";

const currencyRouter = Router();

currencyRouter.get(
  "/rates",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await getRates("SEK"));
    } catch (err) {
      next(err);
    }
  },
);

export default currencyRouter;
