const express = require("express");
const { Pool } = require("pg");
const { parse, format, isValid } = require("date-fns");

require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Helper function for query
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
};

// Validation
const validValues = {
  status: ["TO DO", "IN PROGRESS", "DONE"],
  priority: ["HIGH", "MEDIUM", "LOW"],
  category: ["WORK", "HOME", "LEARNING"],
};

const validValuesChecking = (req, res, next) => {
  const { status, priority, category, dueDate } = { ...req.query, ...req.body };
  
  if (status && !validValues.status.includes(status)) return res.status(400).send("Invalid Todo Status");
  if (priority && !validValues.priority.includes(priority)) return res.status(400).send("Invalid Todo Priority");
  if (category && !validValues.category.includes(category)) return res.status(400).send("Invalid Todo Category");
  if (dueDate) {
    const parsedDate = parse(dueDate, "yyyy-MM-dd", new Date());
    if (!isValid(parsedDate)) return res.status(400).send("Invalid Due Date");
  }
  next();
};

// Response formatting
const resposiveFormate = (data) => ({
  id: data.id,
  todo: data.todo,
  priority: data.priority,
  status: data.status,
  category: data.category,
  dueDate: data.due_date,
});

// API 1: Get todos
app.get("/todos/", validValuesChecking, async (req, res) => {
  const { status, priority, category, search_q } = req.query;
  let sql = "SELECT * FROM todo WHERE 1=1";
  const params = [];

  if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
  if (priority) { params.push(priority); sql += ` AND priority = $${params.length}`; }
  if (category) { params.push(category); sql += ` AND category = $${params.length}`; }
  if (search_q) { params.push(`%${search_q}%`); sql += ` AND todo LIKE $${params.length}`; }

  const result = await query(sql, params);
  res.send(result.rows.map(resposiveFormate));
});

// API 2: Get todo by ID
app.get("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const result = await query("SELECT * FROM todo WHERE id = $1", [todoId]);
  res.send(resposiveFormate(result.rows[0]));
});

// API 3: Get todos by due date
app.get("/agenda/", async (req, res) => {
  const { date } = req.query;
  const parseDate = parse(date, "yyyy-MM-dd", new Date());
  if (!isValid(parseDate)) return res.status(400).send("Invalid Due Date");

  const formateDate = format(parseDate, "yyyy-MM-dd");
  const result = await query("SELECT * FROM todo WHERE due_date = $1", [formateDate]);
  res.send(result.rows.map(resposiveFormate));
});

// API 4: Add todo
app.post("/todos/", validValuesChecking, async (req, res) => {
  const { todo, priority, status, category, dueDate } = req.body;
  const parseDate = parse(dueDate, "yyyy-MM-dd", new Date());
  if (!isValid(parseDate)) return res.status(400).send("Invalid Due Date");

  const formateDate = format(parseDate, "yyyy-MM-dd");
  await query(
    "INSERT INTO todo (todo, priority, status, category, due_date) VALUES ($1, $2, $3, $4, $5)",
    [todo, priority, status, category, formateDate]
  );
  res.send("Todo Successfully Added");
});

// API 5: Update todo
app.put("/todos/:todoId/", validValuesChecking, async (req, res) => {
  const { todoId } = req.params;
  const { todo, priority, status, category, dueDate } = req.body;

  if (status) { await query("UPDATE todo SET status=$1 WHERE id=$2", [status, todoId]); return res.send("Status Updated"); }
  if (priority) { await query("UPDATE todo SET priority=$1 WHERE id=$2", [priority, todoId]); return res.send("Priority Updated"); }
  if (category) { await query("UPDATE todo SET category=$1 WHERE id=$2", [category, todoId]); return res.send("Category Updated"); }
  if (todo) { await query("UPDATE todo SET todo=$1 WHERE id=$2", [todo, todoId]); return res.send("Todo Updated"); }
  if (dueDate) {
    const parseDate = parse(dueDate, "yyyy-MM-dd", new Date());
    if (!isValid(parseDate)) return res.status(400).send("Invalid Due Date");
    const formateDate = format(parseDate, "yyyy-MM-dd");
    await query("UPDATE todo SET due_date=$1 WHERE id=$2", [formateDate, todoId]);
    return res.send("Due Date Updated");
  }
});

// API 6: Delete todo
app.delete("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  await query("DELETE FROM todo WHERE id=$1", [todoId]);
  res.send("Todo Deleted");
});

app.listen(PORT, () => console.log(`Server Running at http://localhost:${PORT}/`));

module.exports = app;
