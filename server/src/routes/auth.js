import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import cloudinary from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const cloudinaryV2 = cloudinary.v2;

cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinaryV2,
  params: {
    folder: "instaclone",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    cb(
      allowed.includes(file.mimetype)
        ? null
        : new Error("Use a JPG, PNG, or WebP image."),
      allowed.includes(file.mimetype)
    );
  },
});

function setSessionCookie(res, userId) {
  const token = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

router.post("/signup", upload.single("profilePicture"), async (req, res, next) => {
  try {
    const { firstName, lastName, username, email, dateOfBirth, password } = req.body;
    if (![firstName, lastName, username, email, dateOfBirth, password].every(v => typeof v === "string" && v.trim())) {
      return res.status(400).json({ message: "Please complete all required fields." });
    }
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
    if (!/^[a-zA-Z0-9._]{3,24}$/.test(username)) {
      return res.status(400).json({ message: "Username must be 3–24 characters and use letters, numbers, dots, or underscores." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime()) || dob >= new Date()) return res.status(400).json({ message: "Enter a valid date of birth." });

    const existing = await User.findOne({ $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] });
    if (existing) return res.status(409).json({ message: "That username or email is already registered." });

    const passwordHash = await bcrypt.hash(password, 12);
    const profilePicture = req.file ? req.file.path : "";
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      dateOfBirth: dob,
      passwordHash,
      profilePicture
    });
    setSessionCookie(res, user._id.toString());
    res.status(201).json({ message: "Account created.", user });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "That username or email is already registered." });
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) return res.status(400).json({ message: "Enter your username/email and password." });
    const user = await User.findOne({
      $or: [{ username: login.toLowerCase() }, { email: login.toLowerCase() }]
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Incorrect username/email or password." });
    }
    setSessionCookie(res, user._id.toString());
    res.json({ message: "Signed in successfully.", user });
  } catch (err) { next(err); }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json({ user });
  } catch (err) { next(err); }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  });
  res.json({ message: "Signed out." });
});

export default router;
