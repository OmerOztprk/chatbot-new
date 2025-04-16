require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");

const config = {
  aiflowUrl: process.env.AIFLOW_URL,
  port: process.env.PORT || 3000,
};

if (!config.aiflowUrl) {
  console.error(".env dosyasında AIFLOW_URL tanımlı değil.");
  process.exit(1);
}

async function streamFromAIFlow(userMessage, res) {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const response = await axios({
      method: "post",
      url: config.aiflowUrl,
      data: { message: userMessage },
      headers: { "Content-Type": "application/json" },
      responseType: "stream",
    });

    response.data.on("data", (chunk) => {
      const text = chunk.toString();

      if (text.trim().startsWith("data:")) {
        const dataarray = text.split("\n\n").filter(Boolean);

        for (let i = 0; i < dataarray.length; i++) {
          let data = dataarray[i];

          res.write(data + "\n\n");
        }
      }
    });

    response.data.on("end", () => {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    });

    response.data.on("error", (err) => {
      console.error("Stream hatası:", err);
      res.write(
        `data: ${JSON.stringify({ error: "Akışta bir hata oluştu." })}\n\n`
      );
      res.end();
    });
  } catch (error) {
    console.error("AIFlow bağlantı hatası:", error.message);
    res.write(
      `data: ${JSON.stringify({
        error: "AIFlow'a bağlanırken bir hata oluştu.",
      })}\n\n`
    );
    res.end();
  }
}

async function handleChat(req, res, next) {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      const error = new Error(
        "Mesaj alanı zorunludur ve metin (string) olmalıdır."
      );
      error.statusCode = 400;
      throw error;
    }

    return streamFromAIFlow(message, res);
  } catch (error) {
    return next(error);
  }
}

const app = express();

app.use(cors());

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.post("/api/chat", handleChat);

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Sunucuda bir hata oluştu.";
  console.error("Hata:", message);

  return res.status(statusCode).json({
    status: "hata",
    message,
  });
}

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(
    `AIFlow bot http://localhost:${config.port} adresinde çalışıyor.`
  );
});
