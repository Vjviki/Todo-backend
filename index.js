const express = require("express");
const { Pool } = require("pg");
const { parse, format, isValid } = require("date-fns");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PG_PORT || 3000;

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.PG_USER, // e.g., "postgres"
  host: process.env.PG_HOST || "localhost",
  database: process.env.PG_DATABASE, // e.g., "tododb"
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT || 5432,
  ssl: {
    rejectUnauthorized: false, // for Render Postgres
  },
});

// Valid values for status, priority, category
const validValues = {
  status: ["TO DO", "IN PROGRESS", "DONE"],
  priority: ["HIGH", "MEDIUM", "LOW"],
  category: ["WORK", "HOME", "LEARNING"],
};

const validValuesChecking = (req, res, next) => {
  const { status, priority, category, dueDate } = { ...req.query, ...req.body };

  if (status && !validValues.status.includes(status))
    return res.status(400).send("Invalid Todo Status");
  if (priority && !validValues.priority.includes(priority))
    return res.status(400).send("Invalid Todo Priority");
  if (category && !validValues.category.includes(category))
    return res.status(400).send("Invalid Todo Category");
  if (dueDate) {
    const parsedDate = parse(dueDate, "yyyy-MM-dd", new Date());
    if (!isValid(parsedDate)) return res.status(400).send("Invalid Due Date");
  }
  next();
};

const resposiveFormate = (data) => ({
  id: data.id,
  todo: data.todo,
  priority: data.priority,
  status: data.status,
  category: data.category,
  dueDate: data.due_date,
});

// Initialize server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

// =========================
// API 1: Get todos
// =========================
app.get("/todos/", validValuesChecking, async (req, res) => {
  const { status, category, priority, search_q } = req.query;

  let baseQuery = "SELECT * FROM todo WHERE 1=1";
  const params = [];
  let count = 1;

  if (status) {
    baseQuery += ` AND status = $${count++}`;
    params.push(status);
  }
  if (priority) {
    baseQuery += ` AND priority = $${count++}`;
    params.push(priority);
  }
  if (category) {
    baseQuery += ` AND category = $${count++}`;
    params.push(category);
  }
  if (search_q) {
    baseQuery += ` AND todo ILIKE $${count++}`;
    params.push(`%${search_q}%`);
  }

  try {
    const result = await pool.query(baseQuery, params);
    res.send(result.rows.map(resposiveFormate));
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// =========================
// API 2: Get todo by ID
// =========================
app.get("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  try {
    const result = await pool.query("SELECT * FROM todo WHERE id = $1", [
      todoId,
    ]);
    res.send(resposiveFormate(result.rows[0]));
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// =========================
// API 3: Get todos by agenda (date)
// =========================
app.get("/agenda/", async (req, res) => {
  const { date } = req.query;
  const parseDate = parse(date, "yyyy-MM-dd", new Date());
  if (!isValid(parseDate)) return res.status(400).send("Invalid Due Date");

  const formateDate = format(parseDate, "yyyy-MM-dd");
  try {
    const result = await pool.query("SELECT * FROM todo WHERE due_date = $1", [
      formateDate,
    ]);
    res.send(result.rows.map(resposiveFormate));
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// =========================
// API 4: Add new todo
// =========================
app.post("/todos/", validValuesChecking, async (req, res) => {
  const { todo, priority, status, category, dueDate } = req.body;
  const parseDate = parse(dueDate, "yyyy-MM-dd", new Date());
  if (!isValid(parseDate)) return res.status(400).send("Invalid Due Date");
  const formateDate = format(parseDate, "yyyy-MM-dd");

  try {
    await pool.query(
      "INSERT INTO todo (todo, priority, status, category, due_date) VALUES ($1, $2, $3, $4, $5)",
      [todo, priority, status, category, formateDate]
    );
    res.send("Todo Successfully Added");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// =========================
// API 5: Update todo
// =========================
app.put("/todos/:todoId/", validValuesChecking, async (req, res) => {
  const { todoId } = req.params;
  const { todo, priority, status, category, dueDate } = req.body;

  try {
    if (status) {
      await pool.query("UPDATE todo SET status = $1 WHERE id = $2", [
        status,
        todoId,
      ]);
      return res.send("Status Updated");
    }
    if (priority) {
      await pool.query("UPDATE todo SET priority = $1 WHERE id = $2", [
        priority,
        todoId,
      ]);
      return res.send("Priority Updated");
    }
    if (category) {
      await pool.query("UPDATE todo SET category = $1 WHERE id = $2", [
        category,
        todoId,
      ]);
      return res.send("Category Updated");
    }
    if (todo) {
      await pool.query("UPDATE todo SET todo = $1 WHERE id = $2", [
        todo,
        todoId,
      ]);
      return res.send("Todo Updated");
    }
    if (dueDate) {
      const parseDate = parse(dueDate, "yyyy-MM-dd", new Date());
      if (!isValid(parseDate)) return res.status(400).send("Invalid Due Date");
      const formateDate = format(parseDate, "yyyy-MM-dd");
      await pool.query("UPDATE todo SET due_date = $1 WHERE id = $2", [
        formateDate,
        todoId,
      ]);
      return res.send("Due Date Updated");
    }
    res.status(400).send("No valid fields to update");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// =========================
// API 6: Delete todo
// =========================
app.delete("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  try {
    await pool.query("DELETE FROM todo WHERE id = $1", [todoId]);
    res.send("Todo Deleted");
  } catch (err) {
    res.status(500).send(err.message);
  }
});
module.exports = app;
