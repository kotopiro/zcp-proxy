import app from "./proxy.js";

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log("Proxy running on port " + PORT);
});
