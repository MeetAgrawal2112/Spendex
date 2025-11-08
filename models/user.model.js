import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();


const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "deactivated"],
      default: "active",
    },
    profilePic: {
      type: String,
    },
    theme: {
      type: String,
      enum: ["light", "dark"],
      default: "light",
    },
    password: {
      type: String,
      required: true,
    },
    refreshTokens: [
      {
        token: { type: String, required: true },
        deviceInfo: { type: String, default: "unknown" },
        expiresAt: { type: Date },
      },
    ],
  },
  {
    timestamps: true,
  }
);


userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});


userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};


userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      fullName: this.fullName,
      email: this.email,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
  );
};


userSchema.methods.generateRefreshToken = function (deviceInfo) {
  const token = jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // if a token for device already present update it
  const existing = this.refreshTokens.find((t) => t.deviceInfo === deviceInfo);
  if (existing) {
    existing.token = token;
    existing.expiresAt = expiresAt;
  } else {
    this.refreshTokens.push({ token, deviceInfo, expiresAt });
  }

  return token;
};


userSchema.methods.removeRefreshToken = function (token) {
  this.refreshTokens = this.refreshTokens.filter((t) => t.token !== token);
};


userSchema.methods.clearAllRefreshTokens = function () {
  this.refreshTokens = [];
};


export const User = mongoose.model("User", userSchema);
