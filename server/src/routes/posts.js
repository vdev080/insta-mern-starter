import { Router } from "express";
import multer from "multer";
import cloudinary from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import Post from "../models/Post.js";
import { requireAuth } from "../middleware/auth.js";
import Comment from "../models/Comment.js";

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
    folder: "instaclone/posts",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto", fetch_format: "auto" }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    cb(allowed.includes(file.mimetype) ? null : new Error("Use a JPG, PNG, or WebP image."), allowed.includes(file.mimetype));
  },
});

// Check the account's limit before sending a file to Cloudinary.
async function checkPostLimit(req, res, next) {
  try {
    const count = await Post.countDocuments({ user: req.userId });
    if (count >= 100) return res.status(400).json({ message: "You have reached the 100-image upload limit." });
    next();
  } catch (err) {
    next(err);
  }
}

router.get("/feed", requireAuth, async (_req, res, next) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("user", "firstName lastName username profilePicture");
    res.json({ posts });
  } catch (err) {
    next(err);
  }
});

router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const posts = await Post.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json({ posts, count: posts.length, limit: 100 });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, checkPostLimit, upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file?.path) return res.status(400).json({ message: "Please choose an image to upload." });
    const post = await Post.create({
      user: req.userId,
      imageUrl: req.file.path,
      cloudinaryPublicId: req.file.filename || "",
    });
    const populated = await post.populate("user", "firstName lastName username profilePicture");
    res.status(201).json({ message: "Image uploaded successfully.", post: populated });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/like", requireAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });

    const alreadyLiked = post.likes.some((id) => id.toString() === req.userId);
    if (alreadyLiked) {
      post.likes.pull(req.userId);
    } else {
      post.likes.addToSet(req.userId);
    }
    await post.save();
    res.json({ liked: !alreadyLiked, likeCount: post.likes.length });
  } catch (err) {
    if (err.name === "CastError") return res.status(400).json({ message: "Invalid post ID." });
    next(err);
  }
});


// Add a comment to a post
router.post("/:id/comments", requireAuth, async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment cannot be empty." });
    }

    if (text.trim().length > 500) {
      return res.status(400).json({ message: "Comment is too long." });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const comment = await Comment.create({
      post: post._id,
      user: req.userId,
      text: text.trim(),
    });

    await comment.populate("user", "firstName lastName username profilePicture");

    res.status(201).json({
      message: "Comment added successfully.",
      comment,
    });
  } catch (error) {
    next(error);
  }
});

// Get comments for a post
router.get("/:id/comments", requireAuth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const comments = await Comment.find({ post: post._id })
      .populate("user", "firstName lastName username profilePicture")
      .sort({ createdAt: 1 });

    res.json({ comments });
  } catch (error) {
    next(error);
  }
});


export default router;
