import express from "express";
import "dotenv/config";
import cors from "cors";
import productsRouter from "./product-routes.js";
import cartRouter from "./cart-routes.js";
import orderRouter from "./order-routes.js";
//import messagesRouter from "./routes/messages.js";
import galleryRouter from "./gallery-routes.js";
import contactRouter from "./contact-routes.js";
import collectionRouter from "./collection-routes.js";
import currencyRouter from "./currency-routes.js";

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api/products", productsRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", orderRouter);
//app.use("/api/messages", messagesRouter);
app.use("/api/gallery", galleryRouter);
app.use("/api/contact", contactRouter);
app.use("/api/collections", collectionRouter);
app.use("/api/currency", currencyRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));