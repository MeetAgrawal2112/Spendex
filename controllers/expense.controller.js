import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Expense } from "../models/expense.model.js";
import e from "express";


const createExpense = asyncHandler(async (req, res) => {
    const userId = req.user._id; // from verifyJwt middleware
    const { title, amount, category, date, notes, paymentMethod } = req.body;
  
    // Validate required fields
    if (!title?.trim() || !amount || !category?.trim() || !date) {
      throw new ApiError(400, "Title, amount, category, and date are required");
    }

    const expense=Expense.create({
        userId,
        amount,
        title:title.trim(),
        category:category.trim(),
        date: new Date(date),
        notes:notes?.trim(),
        paymentMethod:paymentMethod || "cash"

    });
    res.status(201).json(new ApiResponse(201,expense,"Expense created successfully"));

});

export {createExpense};