const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware============
app.use(cors());
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.trpf6.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const run = async () => {
    client.connect();
    try {
        const productsCollection = client.db("productsCollection").collection("product")
        const usersCollection = client.db("usersCollection").collection("user")


        app.post('/user', async (req, res) => {
            const newUserEmail = req.body.email;
            const result = await usersCollection.insertOne({ email: newUserEmail })
            res.send(result)
            console.log(`${newUserEmail} is inserted`);
        })

        app.get('/products', async (req, res) => {
            const query = {};
            const result = await productsCollection.find(query).toArray();
            res.send(result);
            console.log('products are responding');
        })




        app.get('/', (req, res) => {
            res.send('hello')
        })
        app.listen(port, () => {
            console.log(`Port ${port} is responding`);
        })
    } finally {

    }
}
run().catch(console.log)



