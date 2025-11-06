import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "Strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const logoutUser = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    throw new ApiError(400, "No refresh token found");
  }

  let decodedUser;
  try {
    decodedUser = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw new ApiError(400, "Invalid or expired refresh token");
  }

  const user = await User.findById(decodedUser._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.removeRefreshToken(refreshToken);
  await user.save();

  res
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const logoutAllDevices = asyncHandler(async (req, res) => {
  const userId = req.user?._id; 

  if (!userId) {
    throw new ApiError(401, "Unauthorized: Invalid user");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.clearAllRefreshTokens();
  await user.save();

  res
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "Logged out from all devices successfully"));
});


const signupUser = asyncHandler(async (req, res) => {
  let { fullName, email, password, deviceInfo } = req.body;

  fullName = fullName?.trim();
  email = email?.trim().toLowerCase();
  password = password?.trim();
  deviceInfo = deviceInfo?.trim() || "unknown";

  if (!fullName || !email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({ email });
  if (existedUser) {
    throw new ApiError(409, "Email already exists");
  }

  const user = await User.create({ fullName, email, password });
  if (!user) {
    throw new ApiError(500, "Something went wrong while creating the user");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken(deviceInfo);

  await user.save();

  const responseUser = await User.findById(user._id).select("-password -refreshTokens");

  res
    .status(201)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        201,
        { user: responseUser, accessToken },
        "User registered successfully"
      )
    );
});

const loginUser = asyncHandler(async (req, res) => {
  let { email, password, deviceInfo } = req.body;
  email = email?.trim().toLowerCase();
  password = password?.trim();
  deviceInfo = deviceInfo?.trim() || "unknown";

  if (!email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPassCorrect = await user.isPasswordCorrect(password);
  if (!isPassCorrect) {
    throw new ApiError(401, "Invalid password");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken(deviceInfo);

  if (!user.refreshTokens.find((t) => t.token === refreshToken)) {
    user.refreshTokens.push({ token: refreshToken, deviceInfo });
  }

  await user.save();

  const loggedInUser = await User.findById(user._id).select("-password -refreshTokens");

  res
    .status(200)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken },
        "User logged in successfully"
      )
    );
});

export { signupUser, loginUser, logoutAllDevices, logoutUser };
