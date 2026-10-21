import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    username: {
      type: String, required: true, unique: true, trim: true,
      lowercase: true, minlength: 3, maxlength: 24,
      match: /^[a-z0-9._]+$/
    },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    dateOfBirth: { type: Date, required: true },
    passwordHash: { type: String, required: true },
    profilePicture: { type: String, default: "" }
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model("User", userSchema);
