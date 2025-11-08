import express from "express";
import {
  loginUser,
  logoutAllDevices,
  logoutUser,
  refreshAccessToken,
  signupUser,
} from "../controllers/user.controller.js";
import { verifyJwt } from "../middlewares/user.middleware.js";
const router = express.Router();

router.post("/signup", signupUser);
router.post("/login", loginUser);
router.post("/logout", verifyJwt, logoutUser);
router.post("/logoutall", verifyJwt, logoutAllDevices);
router.post("/refresh-access-token", verifyJwt,refreshAccessToken);

export default router;
