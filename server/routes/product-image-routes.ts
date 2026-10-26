import { Router, Response, NextFunction } from "express";
import multer from "multer";
import { supabaseAdmin } from "../supabaseClient.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { AuthRequest } from "../types.js";
import {
  MAX_IMAGE_BYTES,
  uploadProductImage,
  deleteStoredImage,
  StorageError,
} from "../integrations/storageAdapter.js";
import { syncRows } from "../searchSync.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
});

router.post(
  "/:id/image",
  requireAuth,
  requireAdmin,
  upload.single("image"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new StorageError("Ingen bild bifogades.", 400);
      }

      const { data: product, error: findError } = await supabaseAdmin
        .from("products")
        .select("id, image_path")
        .eq("id", req.params.id)
        .maybeSingle();
      if (findError) {
        console.error("Kunde inte läsa produkten:", findError);
        return res.status(500).json({ error: "Kunde inte läsa produkten." });
      }
      if (!product) {
        return res.status(404).json({ error: "Produkten hittades inte." });
      }

      const stored = await uploadProductImage(product.id, req.file.buffer);

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("products")
        .update({ image_url: stored.url, image_path: stored.path })
        .eq("id", product.id)
        .select()
        .single();
      if (updateError || !updated) {
        console.error("Kunde inte spara bilden på produkten:", updateError);
        await deleteStoredImage(stored.path);
        return res.status(500).json({
          error:
            "Bilden laddades upp men kunde inte kopplas till produkten. Produkten behåller sin gamla bild.",
        });
      }

      if (product.image_path && product.image_path !== stored.path) {
        await deleteStoredImage(product.image_path);
      }

      const searchIndexStale = !(await syncRows([updated]));
      res.json({ ...updated, searchIndexStale });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
