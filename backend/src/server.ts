import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 5000);

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
