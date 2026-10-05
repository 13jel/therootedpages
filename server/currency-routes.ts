import { Router, Request, Response } from "express";
import {
  getRates,
  CurrencyServiceError,
} from "./integrations/currencyAdapter.js";

const currencyRouter = Router();

currencyRouter.get("/rates", async (_req: Request, res: Response) => {
  try {
    res.json(await getRates("SEK"));
  } catch (err) {
    if (err instanceof CurrencyServiceError) {
      console.error("Valutatjänsten:", err.message);
      return res.status(err.status).json({ error: err.message });
    }
    console.error("Oväntat fel i valutaroute:", err);
    res.status(500).json({ error: "Något gick fel" });
  }
});

export default currencyRouter;
