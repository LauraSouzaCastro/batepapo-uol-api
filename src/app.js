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
		await db.collection("messages").insertOne({ from: participante.name, to: 'Todos', text: 'entra na sala...', type: 'status', time: `${dayjs().format('HH:mm:ss')}` });
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

const mensagemSchema = joi.object({
	to: joi.string().required(),
	text: joi.string().required(),
	type: joi.string().valid('private_message', 'message').required()
});
app.post("/messages", async (req, res) => {
	const mensagem = req.body;
	const from = req.headers.user;
	const validation = mensagemSchema.validate(mensagem);
	if (validation.error) {
		const errors = validation.error.details.map((detail) => detail.message);
		return res.status(422).send(errors);
	}
	try {
		const participanteCadastrado = await db.collection("participants").findOne({ name: from });

		if (!participanteCadastrado) return res.status(422).send("User deve ser um participante existente na lista de participantes");

		await db.collection("messages").insertOne({ from, to: mensagem.to, text: mensagem.text, type: mensagem.type, time: `${dayjs().format('HH:mm:ss')}` });

		res.sendStatus(201);
	} catch (err) {
		console.log(err)
		res.status(500).send("Deu algo errado no servidor")
	}
});
app.get("/messages", async (req, res) => {
	const limit = req.query.limit ;
	const from = req.headers.user;
	if (limit !== undefined && !(parseInt(limit) > 0)) return res.sendStatus(422);
	try {
		let mensagens;
		if(limit === undefined){
			mensagens = await db.collection("messages").find({ $or: [{ from: from }, { to: from }, {type: 'message'}, { to: 'Todos' }] }).toArray();
		}else{
			mensagens = await db.collection("messages").find({ $or: [{ from: from }, { to: from }, {type: 'message'}, { to: 'Todos' }] }).sort({"_id":-1}).limit(parseInt(limit)).toArray();
			mensagens.reverse();
		}
		const listaMensagens = mensagens.map(m => {
			return {to: m.to, text: m.text, type: m.type, from: m.from}
		});

		res.send(listaMensagens);
	} catch (err) {
		console.log(err)
		res.status(500).send("Deu algo errado no servidor")
	}
});
app.listen(5000, () => console.log("Rodando..."));