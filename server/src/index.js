import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import authRoutes from "./routes/auth.js";

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;
fs.mkdirSync(path.resolve("uploads"), { recursive: true });

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static(path.resolve("uploads")));
app.use("/api/auth", authRoutes);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use((err, _req, res, _next) => {
  console.error(err.message);
  if (err.name === "MulterError") return res.status(400).json({ message: "Image upload failed. Use an image under 3 MB." });
  if (err.message?.startsWith("Use a JPG")) return res.status(400).json({ message: err.message });
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(port, () => console.log(`API running at http://localhost:${port}`)))
  .catch(err => { console.error("MongoDB connection failed:", err.message); process.exit(1); });
