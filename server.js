require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.API_KEY;
const keyAdmin = process.env.KEY_ADMIN;

app.use(cors());
app.use(bodyParser.json());

const uri = process.env.MONGODB_URI;
let db;

async function connectDB() {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    try {
        await client.connect();
        db = client.db(process.env.DB_NAME);
        console.log('Conectado ao MongoDB Atlas');
    } catch (err) {
        console.error('Erro ao conectar MongoDB:', err);
        process.exit(1);
    }
}

connectDB();

// Rota de cadastro
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const adminKey = req.headers['x-admin-key'];

    if (adminKey !== keyAdmin) {
        return res.status(403).send({ error: 'KeyAdmin inválida' });
    }

    try {
        const collection = db.collection('users');

        const existingUser = await collection.findOne({ username });
        const existingEmail = await collection.findOne({ email });
        if (existingUser || existingEmail) {
            return res.status(409).send({ error: 'Usuário Ou Email já existente' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await collection.insertOne({
            username,
            email,
            password: hashedPassword
        });

        res.status(201).send({ message: 'Usuário registrado com sucesso' });
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        res.status(500).send({ error: 'Ocorreu um erro ao registrar o usuário' });
    }
});

// Rota de login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const collection = db.collection('users');
        const user = await collection.findOne({ username });

        if (!user) {
            return res.status(401).send({ error: 'Usuário não encontrado' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).send({ error: 'Senha inválida' });
        }

        res.status(200).send({ message: 'Login bem-sucedido' });
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).send({ error: 'Ocorreu um erro ao fazer login' });
    }
});