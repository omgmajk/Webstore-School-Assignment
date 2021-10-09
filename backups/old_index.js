// Setup DB
const dbDriver = require("better-sqlite3");
const db = dbDriver("inventory.sqlite3");

// Initiate express
const express = require("express");
const app = express();

// Serve frontend
app.use(express.static("frontend"));

// Allow json
app.use(express.json());

// Get all tables and views
function setupAllRoutes() {
  let statement = db.prepare(`
    SELECT name, type FROM sqlite_schema
    WHERE
      type IN ('table', 'view')
      AND name <> 'sqlite%'
  `);
  let tablesAndViews = statement.all();
  for (let { name, type } of tablesAndViews) {
    setRoutesForDb(name, type);
  } 
  console.log("Successfully set up routes for all tables and views.") 
}



function setRoutesForDb(tableName, type) {

  // Start REST
  
  // Get all
  app.get("/api/" + tableName, (req, res) => {
    let statement = db.prepare(`
      SELECT * FROM ${tableName}
    `);
    let result = statement.all();
    res.json(result);
  });
  
  // Get single id
  app.get("/api/" + tableName + "/:id", (req, res) => {
  
    let searchId = req.params.id;
  
    let statement = db.prepare(`
      SELECT * FROM ${tableName} WHERE id = :searchId
    `);
    let result = statement.all({
      searchId
    });
    res.json(result[0] || null);
  });
  
  if (type === "view") { return; }

  // Get products from single store
  app.get("/api/store/:id", (req, res) => {
    let searchId = req.params.id;
    let statement = db.prepare(`
      SELECT 
        products.id AS articleNr,
        products.product_name AS productName,
        products.product_description AS productDescription,
        products.product_image AS productImage,
        products.product_price AS productPrice,
        stock.product_amount AS quantity
      FROM
        products, stock
      WHERE
        stock.store_id = :searchId
      AND
        stock.product_id = products.id
      ORDER BY
        articleNr
    `);
    let result = statement.all({
      searchId
    });
    res.json(result || null);
  });
  
  // Get quantity of a product from all stores
  app.get("/api/product/:id", (req, res) => {
    let searchId = req.params.id;
    let statement = db.prepare(`
      SELECT 
        stores.store_name AS store, 
        stock.product_amount AS quantity 
      FROM 
        stores, stock 
      WHERE 
        stock.product_id = :searchId 
      AND 
        stores.id = stock.store_id 
    `);
    let result = statement.all({
      searchId
    });
    res.json(result || null);
  });

  // Create a POST route that creates a new entry
  app.post("/api/" + tableName, (req, res) => {
    let statement = db.prepare(`
      INSERT INTO ${tableName} (${Object.keys(req.body).join(", ")})
      VALUES (${Object.keys(req.body).map(x => ":" + x).join(", ")})
    `);
    let result;
    try {
      result = statement.run(req.body);
    }
    catch (error) {
      result = { error: error + "" };
    }
    res.json(result);
  });
  
  // Delete one
  app.delete("/api/" + tableName + "/:id", (req, res) => {
    let statement = db.prepare(`
      DELETE FROM ${tableName}
      WHERE id = :idToDelete
    `);
    let idToDelete = req.params.id;
    let result = statement.run({
      idToDelete
    });
    res.json(result);
  });

  // Change one or more fields in an existing post
  app.put("/api/" + tableName + "/:id", (req, res) => {
  
    let result;
    try {
      let statement = db.prepare(`
        UPDATE ${tableName}
        SET ${Object.keys(req.body).map(x => x + " = :" + x).join(", ")}
        WHERE id = :id
      `);
      result = statement.run({ ...req.body, id: req.params.id });
    }
    catch (error) {
      result = { error: error + "" }
    }
    res.json(result);
  });

  // Manage stock

  app.delete("/api/emptyproduct/:id", (req, res) => {
    let statement = db.prepare(`
      DELETE FROM stock
      WHERE product_id = :idToDelete
    `);
    let idToDelete = req.params.id;
    let result = statement.run({
      idToDelete
    });
    res.json(result);
  });

  app.delete("/api/emptystore/:id", (req, res) => {
    let statement = db.prepare(`
      DELETE FROM stock
      WHERE store_id = :idToDelete
    `);
    let idToDelete = req.params.id;
    let result = statement.run({
      idToDelete
    });
    res.json(result);
  });

}

setupAllRoutes();
  
// Start the web server on port 3000
app.listen(3000, () => {
  console.log("Listening on port 3000");
});