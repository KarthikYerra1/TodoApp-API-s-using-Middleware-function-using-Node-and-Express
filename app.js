const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { format, toDate, isValid } = require("date-fns");
const app = express();

app.use(express.json());

let db;
const dbPath = path.join(__dirname, "todoApplication.db");

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Initialized and Started ......");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const checkPriority = (priority) => priority !== undefined;
const checkStatus = (status) => status !== undefined;
const checkCategory = (category) => category !== undefined;
const checkDate = (date) => date !== undefined;

const checkStatusValues = (status) =>
  status === "TO DO" || status === "IN PROGRESS" || status === "DONE";

const checkPriorityValues = (priority) =>
  priority === "HIGH" || priority === "MEDIUM" || priority === "LOW";

const checkCategoryValues = (category) =>
  category === "HOME" || category === "WORK" || category === "LEARNING";

const checkQueryValues = (req, res, next) => {
  const { category, status, priority, date } = req.query;

  if (checkCategory(category)) {
    if (checkCategoryValues(category)) {
      req.category = category;
    } else {
      res.status(400);
      res.send("Invalid Todo Category");
      return;
    }
  }

  if (checkStatus(status)) {
    if (checkStatusValues(status)) {
      req.status = status;
    } else {
      res.status(400);
      res.send("Invalid Todo Status");
      return;
    }
  }

  if (checkPriority(priority)) {
    if (checkPriorityValues(priority)) {
      req.priority = priority;
    } else {
      res.status(400);
      res.send("Invalid Todo Priority");
      return;
    }
  }

  if (checkDate(date)) {
    try {
      const formattedDate = format(new Date(date), "yyyy-MM-dd");
      const newDate = toDate(new Date(formattedDate));
      if (isValid(newDate)) {
        req.date = formattedDate;
      } else {
        res.status(400);
        res.send("Invalid Due Date");
        return;
      }
    } catch (e) {
      res.status(400);
      res.send("Invalid Due Date");
      return;
    }
  }

  next();
};

const checkBodyValues = (req, res, next) => {
  const { category, status, priority, dueDate, todo } = req.body;

  if (checkCategory(category)) {
    if (checkCategoryValues(category)) {
      req.category = category;
    } else {
      res.status(400);
      res.send("Invalid Todo Category");
      return;
    }
  }

  if (checkStatus(status)) {
    if (checkStatusValues(status)) {
      req.status = status;
    } else {
      res.status(400);
      res.send("Invalid Todo Status");
      return;
    }
  }

  if (checkPriority(priority)) {
    if (checkPriorityValues(priority)) {
      req.priority = priority;
    } else {
      res.status(400);
      res.send("Invalid Todo Priority");
      return;
    }
  }

  if (checkDate(dueDate)) {
    try {
      const formattedDate = format(new Date(dueDate), "yyyy-MM-dd");
      const newDate = toDate(new Date(formattedDate));
      if (isValid(newDate)) {
        req.dueDate = formattedDate;
      } else {
        res.status(400);
        res.send("Invalid Due Date");
        return;
      }
    } catch (e) {
      res.status(400);
      res.send("Invalid Due Date");
      return;
    }
  }

  req.todo = todo;

  next();
};

const convertDbObjectToResponseObject = (todo) => {
  return {
    id: todo.id,
    todo: todo.todo,
    priority: todo.priority,
    status: todo.status,
    category: todo.category,
    dueDate: todo.due_date,
  };
};

//API to get Todos Based on Different Criteria
app.get("/todos/", checkQueryValues, async (req, res) => {
  const { category = "", priority = "", status = "" } = req;
  const { search_q = "" } = req.query;
  const getTodosQuery = `
        SELECT *
        FROM todo 
        WHERE todo LIKE '%${search_q}%'
        AND category LIKE '%${category}%' AND status LIKE '%${status}%'
        AND priority LIKE '%${priority}%'
    `;
  const todos = await db.all(getTodosQuery);
  res.send(todos.map((each) => convertDbObjectToResponseObject(each)));
});

//API to get Todo based on todo Id
app.get("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const getTodoQuery = `
        SELECT * FROM todo WHERE id=${todoId}
    `;
  const todo = await db.get(getTodoQuery);
  res.send(convertDbObjectToResponseObject(todo));
});

//API to get Todo based on Todo Date
app.get("/agenda/", checkQueryValues, async (req, res) => {
  const { date = "" } = req;
  const getDateTodoQuery = `
    SELECT * FROM todo WHERE due_date = '${date}'
  `;
  const dateTodos = await db.all(getDateTodoQuery);
  res.send(dateTodos.map((each) => convertDbObjectToResponseObject(each)));
});

//API to create new Todo
app.post("/todos/", checkBodyValues, async (req, res) => {
  const {
    category = "",
    status = "",
    priority = "",
    dueDate = "",
    todo = "",
  } = req;
  const { id } = req.body;
  const createTodoQuery = `
        INSERT INTO todo (id, todo, priority, status, category, due_date)
        VALUES(
            ${id},
            '${todo}',
            '${priority}',
            '${status}',
            '${category}',
            '${dueDate}'
        )
  `;
  const dbResponse = await db.run(createTodoQuery);
  res.send("Todo Successfully Added");
});

//API to update a Todo
app.put("/todos/:todoId/", checkBodyValues, async (req, res) => {
  const { todoId } = req.params;
  const reqBody = req.body;
  let statusText;

  switch (true) {
    case reqBody.todo !== undefined:
      statusText = "Todo";
      break;
    case reqBody.priority !== undefined:
      statusText = "Priority";
      break;
    case reqBody.status !== undefined:
      statusText = "Status";
      break;
    case reqBody.category !== undefined:
      statusText = "Category";
      break;
    case reqBody.dueDate !== undefined:
      statusText = "Due Date";
      break;
  }

  const prevTodoQuery = `
        SELECT * FROM todo WHERE id = ${todoId}
    `;
  const prevTodo = await db.get(prevTodoQuery);
  const {
    todo = prevTodo.todo,
    priority = prevTodo.priority,
    status = prevTodo.status,
    category = prevTodo.category,
    dueDate = prevTodo.due_date,
  } = req;
  const updateTodoQuery = `
    UPDATE todo SET 
        todo = '${todo}',
        priority = '${priority}',
        status = '${status}',
        category = '${category}',
        due_date = '${dueDate}'
    WHERE id = ${todoId}
  `;
  await db.run(updateTodoQuery);
  res.send(`${statusText} Updated`);
});

//API to delete a Todo
app.delete("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const deleteTodoQuery = `
        DELETE FROM todo WHERE id = ${todoId}
    `;
  await db.run(deleteTodoQuery);
  res.send("Todo Deleted");
});

module.exports = app;
