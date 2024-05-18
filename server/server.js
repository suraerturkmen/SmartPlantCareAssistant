const express = require("express");
const app = express();
const PORT = 8080;
const cors = require("cors");
const mqtt = require("mqtt");
const sqlite3 = require("sqlite3").verbose();

app.use(cors());

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

let mqttClient;

// change the RASPERRYPI_BROKER to your broker IP
const RASPERRYPI_BROKER = "192.168.100.22:1883";
const clientId = "client" + Math.random().toString(36).substring(7);
const host = `ws://${RASPERRYPI_BROKER}/mqtt`;

const options = {
  keepalive: 60,
  clientId: clientId,
  protocolId: "MQTT",
  protocolVersion: 4,
  clean: true,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
};

mqttClient = mqtt.connect(host, options);

mqttClient.on("error", (err) => {
  console.log("Error: ", err);
  mqttClient.end();
});

mqttClient.on("reconnect", () => {
  console.log("Reconnecting...");
});

mqttClient.on("connect", () => {
  console.log("Client connected:" + clientId);
});

// Received
mqttClient.on("message", (topic, message, packet) => {
  console.log(
    "Received Message: " + message.toString() + "\nOn topic: " + topic
  );
  const msg = message.toString();
  db.run(`INSERT INTO messages (message) VALUES (?)`, [msg], (err) => {
    if (err) {
      console.error("Error inserting message into database:", err.message);
    }
  });
});

// Route to get the last 30 messages
app.get("/api/mqtt_messages", (req, res) => {
  db.all(
    `SELECT message FROM messages ORDER BY id DESC LIMIT 30`,
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

// Mock data for home endpoint
app.get("/api/home", (req, res) => {
  res.json({
    messages: [
      {
        temperature: "26",
        humidity: "15%",
        lightness: "10",
      },
      {
        temperature: "25",
        humidity: "14%",
        lightness: "9",
      },
      {
        temperature: "27",
        humidity: "12%",
        lightness: "11",
      },
      {
        temperature: "28",
        humidity: "10%",
        lightness: "13",
      },
    ],
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
