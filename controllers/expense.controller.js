import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Expense } from "../models/expense.model.js";
import { User } from "../models/user.model.js";


const createExpense = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { title, amount, category, date, notes, paymentMethod } = req.body;
  
    if (!title?.trim() || !amount || !category?.trim() || !date) {
      throw new ApiError(400, "Title, amount, category, and date are required");
    }

    const expense=await Expense.create({
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

const getExpenses = asyncHandler(async (req, res) => {

  const userId = req.user._id;
  const {startDate, endDate, category}=req.query;
  const filter={userId};
  
  if(category){
    filter.category=category;
  }
  if (startDate || endDate) {
    // If only endDate provided, startDate is optional
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : new Date();
  
    // Validation: endDate should not be before startDate
    if (start && end < start) {
      throw new ApiError(400, "endDate cannot be earlier than startDate");
    }
  
    filter.date = {};
    if (start) filter.date.$gte = start;
    if (end) filter.date.$lte = end;
  }

  
  const expenses=await Expense.find(filter).sort({date:-1});

  res.status(200)
  .json(new ApiResponse(200,expenses,"Expenses fetching successfull"))

});

const updateExpense=asyncHandler(async(req,res)=>{
  const userId = req.user._id;
  const expenseId=req.params.id;
  let { title, amount, category, date, notes, paymentMethod } = req.body;
  title=title?.trim();
  category=category?.trim();
  paymentMethod=paymentMethod?.trim();
  notes=notes?.trim();

  const updates={};
  if(title){
    updates.title=title;
  }
  if(amount){
  if(amount<=0){
    throw new ApiError(400,"Amount must be positive");
  }
    updates.amount=amount;
  }
  if(category){
    updates.category=category;
  }

  // check date if provided properly
  if (date) {
  const newDate = new Date(date);
  if (isNaN(newDate)) throw new ApiError(400, "Invalid date format");
  updates.date = newDate;
}

  if(notes){
    updates.notes=notes;
  }
  if(paymentMethod){
    updates.paymentMethod=paymentMethod;
  }
  const expenseUpdated=await Expense.findOneAndUpdate({_id:expenseId,userId},{$set:updates},{new:true});
  if(!expenseUpdated){
    throw new ApiError(404,"Expense not found");
  }

  res.status(200).json(new ApiResponse(200,expenseUpdated,"Expense updated successfully"));
});

const deleteExpense=asyncHandler(async(req,res)=>{
  const userId = req.user._id;
  const expenseId=req.params.id;
  const expenseDeleted=await Expense.findOneAndDelete({_id:expenseId,userId});
  if(!expenseDeleted){
    throw new ApiError(404,"Expense not found");
  }
  res.status(200).json(new ApiResponse(200,expenseDeleted,"Expense deleted successfully"));
});


const weeklyExpense=asyncHandler(async(req,res)=>{
  const userId = req.user._id;
  const endDate=new Date();
  const startDate=new Date();
  startDate.setDate(endDate.getDate()-7);

  const spent=await Expense.aggregate([
    {
      $match:{ userId:userId, date:{$gte:startDate,$lte:endDate}}
    },
    {
      $group:{_id:null,totalSpent:{$sum:"$amount"}}
    }
  ])

  const totalSpent=spent[0]?.totalSpent||0;

  res.status(200).json(new ApiResponse(200,{totalSpent,startDate,endDate},"Weekly expense fetched successfully"));

});


const monthlyExpense=asyncHandler(async(req,res)=>{
  const userId = req.user._id;
  const endDate=new Date();
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1); // first day of current month
  const spent=await Expense.aggregate([
    {
      $match:{ userId:userId, date:{$gte:startDate,$lte:endDate}}
    },
    {
      $group:{_id:null,totalSpent:{$sum:"$amount"}}
    }
  ])
  const totalSpent=spent[0]?.totalSpent||0;

  res.status(200).json(new ApiResponse(200,{totalSpent,startDate,endDate},"Monthly expense fetched successfully"));
});

const categorySummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { startDate, endDate } = req.query;

  const filter = { userId };


  if (startDate || endDate) {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : new Date();

    if (start && end < start) {
      throw new ApiError(400, "endDate cannot be earlier than startDate");
    }

    filter.date = {};
    if (start) filter.date.$gte = start;
    if (end) filter.date.$lte = end;
  }


  const summary = await Expense.aggregate([
    { $match: filter },
    { $group: { _id: "$category", totalSpent: { $sum: "$amount" } } },
    { $sort: { totalSpent: -1 } },
  ]);


  const formattedSummary = summary.map((item) => ({
    category: item._id,
    totalSpent: item.totalSpent,
  }));


  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        formattedSummary,
        "Category-wise expense summary fetched successfully"
      )
    );
});


const dailySummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const endDate = new Date();
  const last7Days = new Date();
  last7Days.setDate(endDate.getDate() - 6);

  const filter = { userId, date: { $gte: last7Days, $lte: endDate } };

  const summary = await Expense.aggregate([
    { $match: filter },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$date" },
        },
        totalSpent: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const summaryMap = new Map(summary.map(item => [item._id, item.totalSpent]));

  // Step 5: Fill in missing days with totalSpent = 0
  const formattedSummary = [];
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(last7Days);
    currentDate.setDate(last7Days.getDate() + i);
    const formattedDate = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD

    formattedSummary.push({
      date: formattedDate,
      totalSpent: summaryMap.get(formattedDate) || 0,
    });
  }

  res.status(200).json(
    new ApiResponse(
      200,
      formattedSummary,
      "Daily expense summary (last 7 days) fetched successfully"
    )
  );
});


const customDatesExpense = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  let { startDate, endDate } = req.body;

  startDate = new Date(startDate);
  endDate = new Date(endDate);

  if (!startDate || !endDate || isNaN(startDate) || isNaN(endDate)) {
    throw new ApiError(400, "Please provide valid startDate and endDate");
  }
  if (startDate > endDate) {
    throw new ApiError(400, "startDate cannot be greater than endDate");
  }

  const filter = { userId, date: { $gte: startDate, $lte: endDate } };

  const summary = await Expense.aggregate([
    { $match: filter },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$date" },
        },
        totalSpent: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const summaryMap = new Map(summary.map(item => [item._id, item.totalSpent]));

  // ✅ Generate all dates in range and fill missing with 0
  const formattedSummary = [];
  const totalDays =
    Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const formattedDate = currentDate.toISOString().split("T")[0];

    formattedSummary.push({
      date: formattedDate,
      totalSpent: summaryMap.get(formattedDate) || 0,
    });
  }

  res.status(200).json(
    new ApiResponse(
      200,
      formattedSummary,
      "Daily expense summary (custom dates) fetched successfully"
    )
  );
});

const averageWeeklyExpense = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Define the 7-day range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 6); // includes today

  // Filter for last 7 days
  const filter = { userId, date: { $gte: startDate, $lte: endDate } };

  // Aggregate total spent
  const spent = await Expense.aggregate([
    { $match: filter },
    { $group: { _id: null, totalSpent: { $sum: "$amount" } } }
  ]);

  const totalSpent = spent.length > 0 ? spent[0].totalSpent : 0;
  const averageWeeklyExpense = Number((totalSpent / 7).toFixed(2)); // format to 2 decimals

  res.status(200).json(
    new ApiResponse(
      200,
      {
        totalSpent,
        averageWeeklyExpense,
        range: {
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0]
        }
      },
      "Average weekly expense fetched successfully"
    )
  );
});


const topCategorySpending=asyncHandler(async(req,res)=>{
  const userId=req.user._id;
  const endDate=new Date();
  const startDate=new Date();
  startDate.setDate(endDate.getDate()-6);
  const filter={userId,date:{$gte:startDate,$lte:endDate}};
  const summary=await Expense.aggregate([
    {$match:filter},
    {
      $group:{
        _id:"$category",
        totalSpent:{$sum:"$amount"}
      }
    },
    {$sort:{totalSpent:-1}},
    {$limit:3}
  ]); 
  if(summary.length===0){
    return res.status(200).json(new ApiResponse(200,[], "No expenses found in the last 7 days"));
  }

  const topCategory=summary.map(item=>({
    category:item._id,
    totalSpent:item.totalSpent
  }));

  return res.status(200)
  .json(new ApiResponse(200,topCategory,"Top 3 category spending in last 7 days fetched successfully"));

})

export {createExpense,getExpenses,updateExpense,deleteExpense,weeklyExpense,monthlyExpense,categorySummary,dailySummary,customDatesExpense,topCategorySpending, averageWeeklyExpense}; ;