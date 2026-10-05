import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import productsRouter from "./product-routes.js";


dotenv.config();

let app = express();

app.use(express.json()); 
app.use(express.urlencoded());
app.use(cors());
app.use("/api/products", productsRouter);

app.get("/", (req, res) => {
    res.send("Hello world<form method='post'><button type='submit'>Sign in</button></form>");
});

app.post("/", (req, res) => {
    res.redirect("/api/me");
});

app.get("/api/me", (req, res) => {
    res.json({ userId: 1 });
});

let count = 0;
app.get("/api/count", (req, res) => {
    count++;
    res.json({ "count": count });
});

let port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("Listening to " + port);
});