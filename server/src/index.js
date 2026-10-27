
import dotenv from "dotenv";
dotenv.config();

import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import authRoutes from "./routes/auth.js";
import postRoutes from "./routes/posts.js";

const app = express();
const port = process.env.PORT || 5000;

fs.mkdirSync(path.resolve("uploads"), { recursive: true });

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/uploads", express.static(path.resolve("uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use((err, _req, res, _next) => {
  console.error(err.message);

  if (err.name === "MulterError") {
    return res.status(400).json({
      message: "Image upload failed. Use an image under 3 MB."
    });
  }

  if (err.message?.startsWith("Use a JPG")) {
    return res.status(400).json({ message: err.message });
  }

  res.status(500).json({
    message: "Something went wrong. Please try again."
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(port, () => {
      console.log(`API running on port ${port}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  });
