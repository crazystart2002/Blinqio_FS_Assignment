import express from "express";
import pkg from "pg";  
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs"; 




const { Client } = pkg;
const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000"], 
    methods: ["GET", "POST", "DELETE", "PATCH"],
    credentials: true,
  })
);
app.use(cookieParser());

// PostgreSQL client setup
const client = new Client({
  host: "localhost",
  user: "aryangoel",
  password: "admin",
  database: "blinqio",  // Replace with your database name
  port: 5432,           // Default PostgreSQL port
});

client.connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => console.error("Error connecting to PostgreSQL:", err));
    

// Start server



  app.get("/items", async (req, res) => {
    console.log("working");
    const query = "SELECT id, name, price FROM items"; // Replace 'items' with your table name
  
    try {
      const result = await client.query(query);
      res.status(200).json(result.rows); // Send the rows as JSON
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error fetching items" });
    }
  });


  app.post("/items", async (req, res) => {

    const { name, price } = req.body;
  
    if (!name || !price) {
      return res.status(400).json({ message: "Name and price are required." });
    }
  
    const query = "INSERT INTO items (name, price) VALUES ($1, $2)";
    try {
      await client.query(query, [name, parseFloat(price)]);
      res.status(200).json({ message: "Item added successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error adding item to database." });
    }
  });


  app.get("/cart", async (req, res) => {
    try {
      const query = `
        SELECT cart2.id, items.name, items.price, cart2.quantity
        FROM cart2
        JOIN items ON cart2.item_id = items.id;`;  // No need to filter by user_id as there's only one user
  
      const result = await client.query(query);
  
      if (result.rows.length === 0) {
        return res.status(200).json([]);
      }
  
      res.status(200).json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch cart items." });
    }
  });


  app.post("/addToCart", async (req, res) => {
    const { itemId, quantity } = req.body;
    
    if (!itemId || quantity <= 0) {
      return res.status(400).json({ message: "Invalid item or quantity." });
    }
  
    try {
      const query = "INSERT INTO cart2 (item_id, quantity) VALUES ($1, $2)";
      await client.query(query, [itemId, quantity]);
      res.status(200).json({ message: "Item added to cart successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error adding item to cart." });
    }
  });




  app.delete("/cart/:id", async (req, res) => {
    try {
      const { id } = req.params;
  
      const query = "DELETE FROM cart2 WHERE id = $1";
      await client.query(query, [id]);
  
      res.status(200).json({ message: "Item deleted from cart." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to delete item from cart." });
    }
  });

  app.patch("/cart/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity } = req.body;
  
      if (quantity <= 0) {
        return res.status(400).json({ message: "Quantity must be greater than 0." });
      }
  
      const query = "UPDATE cart2 SET quantity = $1, updated_at = NOW() WHERE id = $2 RETURNING *";
      const result = await client.query(query, [quantity, id]);
  
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Item not found." });
      }
  
      res.status(200).json({ message: "Quantity updated.", item: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to update item quantity." });
    }
  });

  app.get("/orders_view", (req, res) => {

    const query = "SELECT * FROM orders;";
    console.log("query");
    client.query(query, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Failed to fetch orders.");
      }
      res.json(results);
    });
  });




  app.post("/createOrder", async (req, res) => {
    const { address, paymentMethod, items, total, createdAt } = req.body;
    console.log("Working345");
  
    try {
      // Insert order into orders table
      const query = `
        INSERT INTO orders (address, payment_method, total, created_at)
        VALUES ($1, $2, $3, $4) RETURNING id;
      `;
      const result = await client.query(query, [address, paymentMethod, total, createdAt]);
  
      const orderId = result.rows[0].id;
  
      // Insert cart items into the order_items table
      for (const item of items) {
        const { id, quantity, price } = item;
  
        // Ensure that price and quantity are valid numbers
        if (isNaN(price) || price <= 0 || isNaN(quantity) || quantity <= 0) {
          return res.status(400).json({ message: "Invalid item price or quantity." });
        }
  
        const unitPrice = parseFloat(price); // Ensure unit price is a valid number
        const totalPrice = (unitPrice * quantity).toFixed(2); // Calculate total price for this item
  
        const insertItemQuery = `
          INSERT INTO order_items2 (order_id, item_id, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5);
        `;
        await client.query(insertItemQuery, [orderId, id, quantity, unitPrice, totalPrice]);
      }
  
      res.status(200).json({ orderId }); // Return orderId for redirection
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error creating the order." });
    }
  });
  app.listen(4000, () => {
    console.log("Server is running on port 4000!");
  });






// Home Page:
// Display a list of items available for purchase.
// Each item should have a name, price, and a "Buy" button.



// item(id, name, price)
// cart(list items)
// 


// ITEM select it add to the cart
// cart have option to update the quantity of the each product




// Shopping Cart:
// Display the items added to the cart with their prices and quantities.
// Allow users to increase or decrease the quantity of items in the cart.
// Display the total price of all items in the cart.
// Include a "Checkout" button to finalize the purchase.


// Checkout Form:
// Collect user details (e.g., name, surname, address).
// Upon submission, save the order details in an "Orders" section.



// Orders Page:
// Display a list of all previous orders made by the user.
