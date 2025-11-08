import express from "express";
import {
  createExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
  weeklyExpense,
  monthlyExpense,
  categorySummary,
  dailySummary,
  customDatesExpense,
} from "../controllers/expense.controller.js";
import { verifyJwt } from "../middlewares/user.middleware.js";

const router = express.Router();

// CRUD routes
router.post("/add", verifyJwt, createExpense);
router.get("/", verifyJwt, getExpenses); // optional filters: startDate, endDate, category
router.put("/:id", verifyJwt, updateExpense);
router.delete("/:id", verifyJwt, deleteExpense);

// Summary routes
router.get("/summary/daily", verifyJwt, dailySummary);
router.get("/summary/weekly", verifyJwt, weeklyExpense);
router.get("/summary/monthly", verifyJwt, monthlyExpense);
router.get("/summary/category", verifyJwt, categorySummary);
router.post("/summary/custom", verifyJwt, customDatesExpense); // uses body: startDate, endDate

export default router;
