import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const mongoClient = new MongoClient(process.env.DATABASE_URL);
try {
	await mongoClient.connect();
	console.log('MongoDB Connected!');
} catch (err) {
  console.log(err.message);
}
const db = mongoClient.db();

app.listen(5000, () => console.log("Rodando..."));