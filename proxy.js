import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(async (req, res) => {
  const url = req.query.url;

  if (!url) {
    res.status(400).send("No URL provided");
    return;
  }

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: req.headers,
      body: req.method !== "GET" ? req.body : undefined
    });

    res.status(response.status);
    response.body.pipe(res);
  } catch (err) {
    res.status(502).send("Proxy error: " + err);
  }
});

export default app;
