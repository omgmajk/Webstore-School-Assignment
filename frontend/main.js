// Disable back button since we never leave index.html
window.history.pushState(null, null, window.location.href);
window.onpopstate = function () {
    window.history.go(1);
};

// Clear the main div
function clearContent(id) {
  document.getElementById(id).innerHTML = "";
}

// Passthrough functions for new pagedisplays

async function getAllProducts() {
  // Fetch all products from api
  let rawData = await fetch("/api/products/");
  // Convert to js
  let products = await rawData.json();
  showAllProducts(products);
}

async function getAllStores() {
  // Fetch all stores from api
  let rawData = await fetch("/api/stores/");
  // Convert to js
  let stores = await rawData.json();
  showAllStores(stores);
}

async function getSingleProduct(productId) {
  // Fetch a single product by id
  let rawData = await fetch("/api/products/" + productId);
  let product = await rawData.json();
  showSingleProduct(product);
}

async function getSingleStore(storeId) {
  let rawData = await fetch("/api/stores/" + storeId);
  let store = await rawData.json();
  showSingleStore(store);
}

async function editStore(storeId) { 
  let rawData = await fetch("/api/stores/" + storeId);
  let store = await rawData.json();
  showEditStore(store);
}

async function editProduct(productId) {
  let rawData = await fetch("/api/products/" + productId);
  let product = await rawData.json();
  showEditProduct(product);
}

/*
  If anyone wonders why the bizarre myId property here is named myId, it's because for some reason you have to use item[n].varname in this case, 
  using a var inbetween breaks the function and I can't figure out why. Example:
  
  let myVar = item[n].theProperty;
  document.querySelector(".someClasee" + myVar).style.display = "block";

  This code would not run, I can't see why but that's why the property comes out of the database as that for both stores and products.
*/

// Add dynamic event listeners to single store/product pages for change buttons
function addDynamicEventListeners(item) {
  for (let i = 0; i < item.length; i++) {
    document.body.addEventListener("click", event => {
      let showEditField = event.target.closest(".editStock" + item[i].myId);
      if(!showEditField) { return; }
        document.querySelector(".editStockForm" + item[i].myId).style.display = "block";
    });
  }
}

async function getSingleProductStores(productId) {
  // Fetch all stores that carry a product by id
  let rawData = await fetch("/api/product/" + productId);
  let product = await rawData.json();
  html = "";
  for(let {myId, store, quantity} of product) {
    html += `<p><b>${store}</b>, 
    ${quantity === 0 ? "Out of stock" : "in stock: " + quantity + " qty"}
     | <button class="editStock${myId}">Edit amount</button></p>
      <form class="editStockForm${myId}" id="editStockForm" action="/api/updatestock" style="Display: none;" method="put">
      <input type="hidden" value="update">
      <input type="hidden" value="product">
      <input type="hidden" name="store_id" value="${myId}">
      <input type="hidden" name="product_id" value="${productId}">
      <p>New amount: <input type="text" name="product_amount" id="changeInput" value="${quantity}">
      <input type="submit" id="changeInput" value="Change"></p>
     </form>
     `;
  }
  addDynamicEventListeners(product);
  return html;
}

async function getSingleStoreProducts(storeId) {
  // Fetch all products from a single store
  let rawData = await fetch("/api/store/" + storeId)
  let store = await rawData.json();
  html = "";
  for(let { myId, productName, quantity } of store) {
    html += `<p><b>${productName}</b>, 
    ${quantity === 0 ? "Out of stock" : "in stock: " + quantity + " qty"}
    | <button class="editStock${myId}">Edit amount</button></p>
    <form class="editStockForm${myId}" id="editStockForm" action="/api/updatestock" style="Display: none;" method="put">
      <input type="hidden" value="update">
      <input type="hidden" value="store">
      <input type="hidden" name="store_id" value="${storeId}">
      <input type="hidden" name="product_id" value="${myId}">
      <p>New amount: <input type="text" name="product_amount" id="changeInput" value="${quantity}">
      <input type="submit" id="changeInput" value="Change"></p>
    </form>
    `;
  }
  addDynamicEventListeners(store);
  return html;
}

// Display message when editing an item
function editedItem(itemType, itemId) {
  clearContent("content");
  let type = itemType.charAt(0).toUpperCase() + itemType.slice(1);
  let html = "";
    html += `
    <h3>${type} with id: ${itemId} has been edited.</h3><br><br>
    <button class="${itemType === "store" ? 
    "showStoresButton\">Back to stores" : 
    "showProductsButton\">Back to products"}</button>
    `;
  let editDiv = document.createElement("div");
  editDiv.className = "editStore";
  editDiv.innerHTML = html;
  let externalDiv = document.getElementById("content");
  if(externalDiv.innerHTML === "") { externalDiv.innerHTML += editDiv.innerHTML; }
}

// Display message when adding store or product
function showAddedProduct(productName) {
  clearContent("content");
  let html = `
    <div class="added">
      <h2>Product added</h2>
      <p>A product with the name: <b>${productName}</b> has been added and
      all stores have been populated with new inventory.</p>
      <button class="showProductsButton">Go to all products</button>
    </div>
  `;
  let addDiv = document.createElement("div");
  addDiv.className = "addProduct";
  addDiv.innerHTML = html;
  let externalDiv = document.getElementById("content");
  if(externalDiv.innerHTML === "") { externalDiv.innerHTML += addDiv.innerHTML; }
}

function showAddedStore(storeName) {
  clearContent("content");
  let html = `
    <div class="added">
      <h2>Store added</h2>
      <p>A store with the name: <b>${storeName}</b> has been added and
      all products have been added to the inventory.</p>
      <button class="showStoresButton">Go to all stores</button>
    </div>
  `;
  let addDiv = document.createElement("div");
  addDiv.className = "addStore";
  addDiv.innerHTML = html;
  let externalDiv = document.getElementById("content");
  if(externalDiv.innerHTML === "") { externalDiv.innerHTML += addDiv.innerHTML; }
}

// Functions for adding stores or products
function addStore() {
  clearContent("content");
  
  let html = `
  <div class="add">
    <h2>Add a store</h2>
    <form class="addStoreForm" action="/api/stores/" method="post">
      <input type="hidden" value="store">
      <label>Store name:<br>
        <input type="text" name="store_name" required minlength="1">
      </label>
      <label> Store address:<br>
        <input type="text" name="store_address" required minlength="1">
      </label>
      <label> Store postal code:<br>
        <input type="text" name="store_postal_code" required minlength="1">
      </label>
      <label> Store city:<br>
        <input type="text" name="store_city" required minlength="1">
      </label>
      <input type="submit" value="Add store">
      </form>
    </div>
  `;

  let addDiv = document.createElement("div");
  addDiv.className = "addStore";
  addDiv.innerHTML = html;
  let externalDiv = document.getElementById("content");
  if(externalDiv.innerHTML === "") { externalDiv.innerHTML += addDiv.innerHTML; }
}

function addProduct() {
  clearContent("content");
  
  let html = `
  <div class="add">
    <h2>Add a product</h2>
    <form class="addProductForm" action="/api/products/" method="post">
      <input type="hidden" value="product">
      <label>Product name:<br>
        <input type="text" name="product_name" required minlength="1">
      </label>
      <label> Product description:<br>
      <textarea name="product_description" cols="50" rows="8" required minlength="1"></textarea>
      </label>
      <label> Product image:<br>
        <input type="text" name="product_image" value="no_image.webp" required minlength="1">
      </label>
      <label> Product price (int):<br>
        <input type="text" name="product_price" required minlength="1">
      </label>
      <input type="submit" value="Add product">
      </form>
    </div>
  `;

  let addDiv = document.createElement("div");
  addDiv.className = "addProduct";
  addDiv.innerHTML = html;
  let externalDiv = document.getElementById("content");
  if(externalDiv.innerHTML === "") { externalDiv.innerHTML += addDiv.innerHTML; }
}

// Show messages when deleting items
function showDeletedStore(idToDelete) {
  clearContent("content");
  let html = `
    <div class="deleted">
      <h2>Store deleted</h2>
      <p>The store with id: ${idToDelete} has been deleted and it's stock has been emptied.</p>
    </div>
  `;
  let deleteDiv = document.createElement("div");
  deleteDiv.className = "deleteStore";
  deleteDiv.innerHTML = html;
  let externalDiv = document.getElementById("content");
  if(externalDiv.innerHTML === "") { externalDiv.innerHTML += deleteDiv.innerHTML; }
}

function showDeletedProduct(idToDelete) {
  clearContent("content");
  let html = `
    <div class="deleted">
      <h2>Product deleted</h2>
      <p>The product with id: ${idToDelete} has been deleted and it's stock has been emptied from stores.</p>
    </div>
  `;
  let deleteDiv = document.createElement("div");
  deleteDiv.className = "deleteProduct";
  deleteDiv.innerHTML = html;
  let externalDiv = document.getElementById("content");
  if(externalDiv.innerHTML === "") { externalDiv.innerHTML += deleteDiv.innerHTML; }
}

// Show edit forms for stores and products
function showEditStore(store) {
  clearContent("content");
  
  let html = `
  <div class="edit">
    <h2>Editing ${store.store_name}</h2>
    <form class="editStoreForm" action="/api/stores/${store.id}" method="put">
      <input type="hidden" value="store">
      <input type="hidden" value="${store.id}">
      <label>Store name:<br>
        <input type="text" placeholder="${store.store_name}" value="${store.store_name}" name="store_name" required minlength="1">
      </label>
      <label> Store address:<br>
        <input type="text" placeholder="${store.store_address}" value="${store.store_address}" name="store_address" required minlength="1">
      </label>
      <label> Store postal code:<br>
        <input type="text" placeholder="${store.store_postal_code}" value="${store.store_postal_code}" name="store_postal_code" required minlength="1">
      </label>
      <label> Store city:<br>
        <input type="text" placeholder="${store.store_city}" value="${store.store_city}" name="store_city" required minlength="1">
      </label>
      <input type="submit" value="Edit store">
      </form>
      <br>
      <br>
      <button class="showStoresButton">Back to stores</button>
    </div>
  `;

  let editDiv = document.createElement("div");
  editDiv.className = "editStore";
  editDiv.innerHTML = html;
  let externalDiv = document.getElementById("content");
  if(externalDiv.innerHTML === "") { externalDiv.innerHTML += editDiv.innerHTML; }
}

function showEditProduct(product) { 
  clearContent("content");
  
  let html = "";
  html = `
  <div class="edit">
    <h2>Editing ${product.product_name}</h2>
    <form class="editProductForm" action="/api/products/${product.id}" method="put">
      <input type="hidden" value="product">
      <input type="hidden" value="${product.id}">
      <label>Product name:<br>
        <input type="text" placeholder="${product.product_name}" value="${product.product_name}" name="product_name" required minlength="1">
      </label>
      <label> Product description:<br>
        <textarea placeholder="${product.product_description}" name="product_description" cols="50" rows="8" required minlength="1">${product.product_description}</textarea>
      </label>
      <label> Product image (filename in frontend/images):<br>
        <input type="text" placeholder="${product.product_image}" value="${product.product_image}" name="product_image" required minlength="1">
      </label>
      <label> Product price (int):<br>
        <input type="text" placeholder="${product.product_price}" value="${product.product_price}" name="product_price" required minlength="1">
      </label>
      <input type="submit" value="Edit product">
    </form>
    <br>
    <br>
    <button class="showProductsButton">Back to products</button>
  </div>
  `;

  let editDiv = document.createElement("div");
  editDiv.className = "editProduct";
  editDiv.innerHTML = html;
  let externalDiv = document.getElementById("content");
  if(externalDiv.innerHTML === "") { externalDiv.innerHTML += editDiv.innerHTML; }
 }

// Show single stores and products after click and also stock
// Had to make these functions async as the return html from getSingleProductStores made an await promise.
async function showSingleStore(store) {
  clearContent("content");
  // Get products in this store
  let product = await getSingleStoreProducts(store.id);
  html = "";
  html += `
    <div class="singleStoreShow">
      <h2>${store.store_name}</h2>
      <p>${store.store_address}<br>
         ${store.store_postal_code}, ${store.store_city}</p>
      <hr>
      <h2>Products in stock</h2>
      ${product}
      <hr>
      <button class="showStoresButton">Back to stores</button>
      <button class="editStoreButton" id="id${store.id}">Edit store info</button>
      <button class="deleteStoreButton" id="id${store.id}">Delete store</button>
    </div>
  `;
    // Add to DOM
    let storeDiv = document.createElement("div");
    storeDiv.className = "singleStore";
    storeDiv.innerHTML = html;
    let externalDiv = document.getElementById("content");
    // Only add if content div is empty
    if(externalDiv.innerHTML === "") { externalDiv.innerHTML += storeDiv.innerHTML; }
}

async function showSingleProduct(product) {
  // Clear the div for new content
  clearContent("content");
  // Get stores that carry this product
  let stores = await getSingleProductStores(product.id);

  // Generate html
  html = "";
  html += `
  <div class="singleProductShow">
    <h3>${product.product_name}</h3>
    <p><b>Article Number:</b> ${product.id}</p>
    <p><b>Product Price:</b> ${product.product_price} SEK</p>
    <p><b>Product Description:</b><br>${product.product_description}</p>
    <p><img src="/images/${product.product_image}" width="400"></p>
    <hr>
    <h2>Stores that carry this item</h2>
    ${stores}
    <hr>
    <button class="showProductsButton">Back to products</button>
    <button class="editProductButton" id="id${product.id}">Edit product info</button>
    <button class="deleteProductButton" id="id${product.id}">Delete product</button>
  </div>
  `;
  // Add to DOM
  let productDiv = document.createElement("div");
  productDiv.className = "singleProduct";
  productDiv.innerHTML = html;
  let externalDiv = document.getElementById("content");
  // Only add if content div is empty
  if(externalDiv.innerHTML === "") { externalDiv.innerHTML += productDiv.innerHTML; }
}

// Show all products and all stores
function showAllProducts(products) {
  // Clear the div for new content
  clearContent("content");
  // Generate html
  html = "";
  html += "<h2>List of all products</h2>";
  html += "<p>Click on a product for more details.</p>";
  for (let { id, product_name, product_price, product_description, product_image } of products) {
    html += `
      <div class="product" id="product-${id}">
        <h3>${product_name}</h3>
        <p><b>Article Number:</b> ${id}</p>
        <p><b>Product Price:</b> ${product_price} SEK</p>
        <p><b>Product Description:</b><br>${product_description}</p>
        <p><img src="/images/${product_image}" width="400"></p>
      </div>
    `;
  }
  // Add to DOM
  let productsDiv = document.createElement("div");
  productsDiv.className = "products";
  productsDiv.innerHTML = html;
  let externalDiv = document.getElementById("content");
  // Only add if content div is empty
  if(externalDiv.innerHTML === "") { externalDiv.innerHTML += productsDiv.innerHTML; }
}

function showAllStores(stores) {
  // Clear the div for new content
  clearContent("content");
  // Generate html
  html = "";
  html += "<h2>List of all stores</h2>";
  html += "<p>Click on a store for more details.</p>";
  for (let {id, store_name, store_address, store_postal_code, store_city} of stores) {
    html += `
      <div class="store" id="store-${id}">
        <h3>${store_name}</h3>
        <p>${store_address}<br>
           ${store_postal_code}, ${store_city}</p>
      </div>
    `;
  }
  // Add to DOM
  let storesDiv = document.createElement("div");
  storesDiv.className = "stores";
  storesDiv.innerHTML = html;
  let externalDiv = document.getElementById("content");
  // Only add if content div is empty
  if(externalDiv.innerHTML === "") { externalDiv.innerHTML += storesDiv.innerHTML; }
}


// Event listeners for menu
document.body.addEventListener("click", async (event) => {
  let button = event.target.closest(".showProductsButton");
  if (!button) { return; }
  if (document.body.querySelector(".products")) { return; }
  getAllProducts();
});

document.body.addEventListener("click", async (event) => {
  let button = event.target.closest(".showStoresButton");
  if (!button) { return; }
  if (document.body.querySelector(".stores")) { return; }
  getAllStores();
});

document.body.addEventListener("click", async (event) => {
  let button = event.target.closest(".addProductButton");
  if (!button) { return; }
  if (document.body.querySelector(".addProduct")) { return; }
  addProduct();
});

document.body.addEventListener("click", async (event) => {
  let button = event.target.closest(".addStoreButton");
  if (!button) { return; }
  if (document.body.querySelector(".addStore")) { return; }
  addStore();
});

// Other event listeners for products and stores
document.body.addEventListener("click", async (event) => {
  let productDiv = event.target.closest(".product");
  if(!productDiv) { return; }
  let id = productDiv.id.slice(8);
  getSingleProduct(id);
});

document.body.addEventListener("click", async (event) => {
  let storeDiv = event.target.closest(".store");
  if(!storeDiv) { return; }
  let id = storeDiv.id.slice(6);
  getSingleStore(id);
});

document.body.addEventListener("click", async (event) => {
  let change = event.target.closest(".editStoreButton")
  if(!change) { return; }
  let id = change.id.slice(2);
  editStore(id);
});

document.body.addEventListener("click", async (event) => {
  let change = event.target.closest(".editProductButton");
  if(!change) { return; }
  let id = change.id.slice(2);
  editProduct(id);
});

// Event listener for handling forms
document.body.addEventListener("submit", async event => {
  // Prevent default reload
  event.preventDefault();
  
  // Get method and routes
  let form = event.target;
  let route = form.getAttribute("action");
  let method = form.getAttribute("method");

  // Get all info from the form
  let requestBody = {};
  for (let { name, value } of form.elements) {
    if(!name) { continue; }
    requestBody[name] = value;
  }

  // Build and send rest data
  let rawResult = await fetch(route, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });
  let result = await rawResult.json();
  
  console.log("Debug ", result);

  
  // Some shenanigans with put to send people to the right places after request.
  if (method === "put" && form.elements[0].value !== "update") {
    editedItem(form.elements[0].value, form.elements[1].value);
  }
  else if (method === "put" && form.elements[0].value === "update") {
    if(form.elements[1].value === "product") {
      getSingleProduct(requestBody.product_id);
    }
    else if (form.elements[1].value === "store") {
      getSingleStore(requestBody.store_id);
    }
    else {
      throw new Error("Something went wrong.");
    }
  }
  else if (method === "post" && form.elements[0].value === "store") {
    showAddedStore(requestBody.store_name);
  }
  else if (method === "post" && form.elements[0].value === "product") {
    showAddedProduct(requestBody.product_name);
  }
  else {
    throw new Error("Something went wrong.");
  }
});

// Event listener for delete buttons
document.body.addEventListener("click", async event => {
  let deleteButton = event.target.closest(".deleteStoreButton");
  if (!deleteButton) { return; }
  let idToDelete = deleteButton.id.slice(2);
  await fetch("/api/emptystore/" + idToDelete, {
    method: "DELETE"
  });
  await fetch("/api/stores/" + idToDelete, {
    method: "DELETE"
  });
  showDeletedStore(idToDelete);
});

document.body.addEventListener("click", async event => {
  let deleteButton = event.target.closest(".deleteProductButton");
  if (!deleteButton) { return; }
  let idToDelete = deleteButton.id.slice(2);
  await fetch("/api/emptyproduct/" + idToDelete, {
    method: "DELETE"
  });
  await fetch("/api/products/" + idToDelete, {
    method: "DELETE"
  });
  showDeletedProduct(idToDelete);
});

