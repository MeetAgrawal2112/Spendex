import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import expenseRoutes from "./routes/expense.route.js";
import userRoutes from "./routes/user.route.js";
dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/expenses", expenseRoutes);

export default app;
