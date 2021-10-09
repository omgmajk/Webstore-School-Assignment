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

function populateStock(storeArr, productArr, itemType) {
  if(itemType === "store") {
    for(let i = 0; i < productArr.length; i++) {
      let statement = db.prepare(`
        INSERT INTO 
          stock (store_id, product_id, product_amount)
        VALUES
          (?,?,?)
      `);
      let result;
      try {
        result = statement.run(
          storeArr[0].id,
          productArr[i].id,
          0 
          );
      }
      catch (error) {
        result = { error: error + "" };
      }
    }
  }
  else if(itemType === "product") {
    for(let i = 0; i < storeArr.length; i++) {
      let statement = db.prepare(`
        INSERT INTO
          stock (store_id, product_id, product_amount)
        VALUES
          (?,?,?)
      `);
      let result; 
      try {
        result = statement.run(
          storeArr[i].id,
          productArr[0].id,
          0 
          );
      }
      catch (error) {
        result = { error: error + "" };
      }
    }
  }
  else {
    throw new Error("Something went wrong.");
  }

}

function getId(itemName, itemType) {
  if(itemType === "store") {
    let statement = db.prepare(`
      SELECT id FROM stores WHERE store_name = '${itemName}'
    `);
    let result = statement.all();
    let secondStatement = db.prepare(`
      SELECT id FROM products
    `);
    let secondResult = secondStatement.all();
    populateStock(result, secondResult, "store");
  }
  else if(itemType === "product") {
    let statement = db.prepare(`
      SELECT id FROM products WHERE product_name = '${itemName}'
    `);
    let result = statement.all();
    let secondStatement = db.prepare(`
      SELECT id FROM stores
    `);
    let secondResult = secondStatement.all();
    populateStock(secondResult, result, "product");
  }
  else {
    throw new Error("Something went wrong.");
  }
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
  
  if (type === "view") { return; } // There are views but they are never used in the app, they remain for testing purposes.

  /* 
    These should have been views, but I'm not used to working with views and would rather handle it in code.
    See comment in main.js for why the id comes out as myId.
  */

  // Get products from single store
  app.get("/api/store/:id", (req, res) => {
    let searchId = req.params.id;
    let statement = db.prepare(`
      SELECT 
        products.id AS myId,
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
        products.id
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
        stores.id AS myId,
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

    // Don't populate if request sent by postman - foreign keys are a b*tch when using delete otherwise.
    if(req.headers["postman-token"]) { res.json(result); return; }

    // Populate stock automatically
    if(req.body.store_name) {
      getId(req.body.store_name, "store");
    } 
    else if (req.body.product_name) {
      getId(req.body.product_name, "product");
    } 
    else {
      throw new Error("Something went wrong");
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

  // Delete all
  app.delete("/api/" + tableName, (req, res) => {
    let statement = db.prepare(`DELETE FROM ${tableName}`);
    let result = statement.run();
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
  app.put("/api/updatestock", (req, res) => {
    let statement = db.prepare(`
      UPDATE stock
      SET product_amount = :quantity
      WHERE store_id = :storeId
      AND product_id = :productId
    `);

    let quantity = req.body.product_amount;
    let storeId = req.body.store_id;
    let productId = req.body.product_id;

    result = statement.run({
      quantity,
      storeId,
      productId
  });
    res.json(result);
  });

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
  
// Start the web server on port 3000 - because 8080 is too oldschool.
app.listen(3000, () => {
  console.log("Listening on port 3000");
});