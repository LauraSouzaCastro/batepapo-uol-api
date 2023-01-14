import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import joi from 'joi';
import dayjs from 'dayjs';
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

const participanteSchema = joi.object({
	name: joi.string().required()
});

app.post("/participants", async (req, res) => {
	const participante = req.body;
	const validation = participanteSchema.validate(participante);
	if (validation.error) {
		const errors = validation.error.details.map((detail) => detail.message);
		return res.status(422).send(errors);
	}
	try {
		const participanteJaCadastrado = await db.collection("participants").findOne(participante);
	
		if (participanteJaCadastrado) return res.status(409).send("Esse nome já está cadastrado!");
	
		await db.collection("participants").insertOne({ name: participante.name, lastStatus: Date.now() });
		await db.collection("messages").insertOne({from: participante.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}` });
		res.sendStatus(201);
	  } catch (err) {
		console.log(err)
		res.status(500).send("Deu algo errado no servidor")
	  }
});

app.get("/participants", async (req, res) => {
	db.collection("participants").find().toArray().then(dados => {
		return res.send(dados)
	}).catch(() => {
		res.status(500).send("Deu erro no servidor de banco de dados")
	});
});
app.listen(5000, () => console.log("Rodando..."));