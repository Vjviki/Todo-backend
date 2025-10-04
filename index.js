const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const { parse, format, isValid } = require("date-fns");

require('dotenv').config();

const dataPath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let db = null;

let PORT = process.env.PORT || 3000;

const initilalizingServerAndDb = async () => {
  try {
    db = await open({
      filename: dataPath,
      driver: sqlite3.Database,
    });
    app.listen(PORT, () =>
      console.log(`Server Running at http://localhost:${PORT}/`)
    );
  } catch (error) {
    console.log(`Error Db: ${error.message}`);
  }
};

initilalizingServerAndDb();

const validValues = {
  status: ["TO DO", "IN PROGRESS", "DONE"],
  priority: ["HIGH", "MEDIUM", "LOW"],
  category: ["WORK", "HOME", "LEARNING"],
};

const validValuesChecking = (request, response, next) => {
  const { status, priority, category, dueDate } = {
    ...request.query,
    ...request.body,
  };

  if (status && !validValues.status.includes(status)) {
    return response.status(400).send("Invalid Todo Status");
  }
  if (priority && !validValues.priority.includes(priority)) {
    return response.status(400).send("Invalid Todo Priority");
  }
  if (category && !validValues.category.includes(category)) {
    return response.status(400).send("Invalid Todo Category");
  }
  if (dueDate) {
    const parsedDate = parse(dueDate, "yyyy-MM-dd", new Date());
    if (!isValid(parsedDate)) {
      return response.status(400).send("Invalid Due Date");
    }
  }
  next();
};

const resposiveFormate = (data) => {
  return {
    id: data.id,
    todo: data.todo,
    priority: data.priority,
    status: data.status,
    category: data.category,
    dueDate: data.due_date,
  };
};

//API 1
app.get("/todos/", validValuesChecking, async (request, response) => {
  const { status, category, priority, search_q } = request.query;
  if (status) {
    const getQueryItem = `
    SELECT *
    FROM todo
    WHERE status = '${status}';`;
    const getQueryList = await db.all(getQueryItem);
    return response.send(
      getQueryList.map((eachItem) => resposiveFormate(eachItem))
    );
  }

  if (priority) {
    const getQueryItem = `
    SELECT *
    FROM todo
    WHERE priority = '${priority}';`;
    const getQueryList = await db.all(getQueryItem);
    return response.send(
      getQueryList.map((eachItem) => resposiveFormate(eachItem))
    );
  }

  if (priority && status) {
    const getQueryItem = `
    SELECT *
    FROM todo
    WHERE priority = '${priority}' AND status = '${status}';`;
    const getQueryList = await db.all(getQueryItem);
    return response.send(
      getQueryList.map((eachItem) => resposiveFormate(eachItem))
    );
  }

  if (status && category) {
    const getQueryItem = `
    SELECT *
    FROM todo
    WHERE status = '${status}' AND category = '${category}';`;
    const getQueryList = await db.all(getQueryItem);
    return response.send(
      getQueryList.map((eachItem) => resposiveFormate(eachItem))
    );
  }

  if (category) {
    const getQueryItem = `
    SELECT *
    FROM todo
    WHERE category = '${category}';`;
    const getQueryList = await db.all(getQueryItem);
    return response.send(
      getQueryList.map((eachItem) => resposiveFormate(eachItem))
    );
  }

  if (category && priority) {
    const getQueryItem = `
    SELECT *
    FROM todo
    WHERE category = '${category}' AND priority = '${priority}';`;
    const getQueryList = await db.all(getQueryItem);
    return response.send(
      getQueryList.map((eachItem) => resposiveFormate(eachItem))
    );
  }

  const getSearch = `
  SELECT * 
  FROM todo
  WHERE todo LIKE '%${search_q}%';`;
  const getSearchItem = await db.all(getSearch);
  response.send(getSearchItem.map((eachItem) => resposiveFormate(eachItem)));
});

//API 2

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getIdQuery = `
  SELECT *
  FROM todo
  WHERE id = ${todoId};`;
  const getIdItem = await db.get(getIdQuery);
  response.send(resposiveFormate(getIdItem));
});

//API 3

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const parseDate = parse(date, "yyyy-MM-dd", new Date());
  if (!isValid(parseDate)) {
    return response.status(400).send("Invalid Due Date");
  }
  const formateDate = format(parseDate, "yyyy-MM-dd");
  const getDateQuery = `
  SELECT *
  FROM todo
  WHERE due_date = '${formateDate}';`;
  const getDataItems = await db.all(getDateQuery);
  response.send(getDataItems.map((eachItem) => resposiveFormate(eachItem)));
});

//API 4

app.post("/todos/", validValuesChecking, async (request, response) => {
  const getDetail = request.body;
  const { id, todo, priority, status, category, dueDate } = getDetail;
  const parseDate = parse(dueDate, "yyyy-MM-dd", new Date());
  if (!isValid(parseDate)) {
    return response.status(400).send("Invalid Due Date");
  }
  const formateDate = format(parseDate, "yyyy-MM-dd");
  const postDetail = `
  INSERT INTO todo (id, todo, priority, status, category, due_date)
  VALUES (${id}, '${todo}', '${priority}', '${status}', '${category}', '${formateDate}');`;
  await db.run(postDetail);
  response.send("Todo Successfully Added");
});

//API 5

app.put("/todos/:todoId/", validValuesChecking, async (request, response) => {
  const getDetail = request.body;
  const { todoId } = request.params;
  const { todo, priority, status, category, dueDate } = getDetail;
  if (status) {
    const putStatus = `
    UPDATE todo
    SET status = '${status}'
    WHERE id = ${todoId};`;
    await db.run(putStatus);
    return response.send("Status Updated");
  }

  if (priority) {
    const putPriority = `
    UPDATE todo
    SET priority = '${priority}'
    WHERE id = ${todoId};`;
    await db.run(putPriority);
    return response.send("Priority Updated");
  }

  if (category) {
    const putCategory = `
    UPDATE todo
    SET category = '${category}'
    WHERE id = ${todoId};`;
    await db.run(putCategory);
    return response.send("Category Updated");
  }

  if (todo) {
    const putTodo = `
    UPDATE todo
    SET todo = '${todo}'
    WHERE id = ${todoId};`;
    await db.run(putTodo);
    return response.send("Todo Updated");
  }

  const parseDate = parse(dueDate, "yyyy-MM-dd", new Date());
  if (!isValid(parseDate)) {
    return response.status(400).send("Invalid Due Date");
  }
  const formateDate = format(parseDate, "yyyy-MM-dd");
  const putDate = `
    UPDATE todo
    SET due_date = '${formateDate}'
    WHERE id = ${todoId};`;
  await db.run(putDate);
  return response.send("Due Date Updated");
});

//API 6

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteItem = `
  DELETE FROM todo
  WHERE id = ${todoId};`;
  await db.run(deleteItem);
  response.send("Todo Deleted");
});

module.exports = app;
