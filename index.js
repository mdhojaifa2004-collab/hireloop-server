
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("HireLoop is running");
});

app.listen(port, () => {
  console.log(`HireLoop is running on port ${port}`);
});
