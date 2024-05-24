const express = require("express");
const cors = require("cors");
const mqtt = require("mqtt");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

// SQLite database setup
const db = new sqlite3.Database("./mqtt_messages.db", (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log("Connected to the MQTT messages database.");
    db.run(
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL
      )`
    );
  }
});

const RASPERRYPI_BROKER = "192.168.1.2"; // Broker IP
const clientId = "client" + Math.random().toString(36).substring(7);
const mqttOptions = {
  clientId: clientId,
  protocol: "mqtt",
};

const mqttClient = mqtt.connect(`mqtt://${RASPERRYPI_BROKER}`, mqttOptions);

mqttClient.on("error", (err) => {
  console.log("Error:", err);
});

mqttClient.on("connect", () => {
  console.log("MQTT Client connected:", clientId);
  mqttClient.subscribe("message", (err) => {
    if (err) {
      console.error("Error subscribing to MQTT topic:", err);
    }
  });
});

mqttClient.on("message", (topic, message) => {
  console.log("Received Message:", message.toString(), "on topic:", topic);
  const msg = message.toString();
  db.run(`INSERT INTO messages (message) VALUES (?)`, [msg], (err) => {
    if (err) {
      console.error("Error inserting message into database:", err.message);
    }
  });
});

app.get("/api/mqtt_messages", (req, res) => {
  db.all(
    `SELECT message FROM messages ORDER BY id DESC LIMIT 1`,
    (err, rows) => {
      if (err) {
        console.error("Error getting messages from database:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        const messages = rows.map((row) => row.message).reverse();
        res.json({ messages });
      }
    }
  );
});

app.post("/api/giveWater", (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }
  console.log("Received message:", message);

  mqttClient.publish("home/garden/water", message, (err) => {
    if (err) {
      console.error("Error publishing message:", err.message);
      return res.status(500).json({ error: "Failed to publish message" });
    }

    console.log(`Message: "${message}" published to topic: "home/garden/water"`);
    res.status(200).json({ success: true, message: "Message published" });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
