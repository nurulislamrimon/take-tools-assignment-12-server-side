const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

// middleware============
app.use(cors());
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.trpf6.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const run = async () => {
    client.connect();
    try {
        const productsCollection = client.db("productsCollection").collection("product")
        const usersCollection = client.db("usersCollection").collection("user");
        // middleware for verification
        const verifyJWT = (req, res, next) => {
            const accessToken = req?.headers?.bearer;
            if (!accessToken) {
                return res.status(401).send({ result: 'Unauthorized access' })
            }
            jwt.verify(accessToken, process.env.JWT_Secret, function (err, decoded) {
                if (err) {
                    return res.status(401).send({ result: 'Unauthrized access' });
                }
                req.decoded = decoded;
                next();
            })
        }

        // upsert user======================
        app.put('/user', async (req, res) => {
            const newUserEmail = req.body.email;
            const accessToken = jwt.sign({ email: newUserEmail }, process.env.JWT_Secret, { expiresIn: '1d' });
            const result = await usersCollection.updateOne(
                {
                    "email": newUserEmail
                },
                {
                    "$set": {
                        "email": newUserEmail
                    }
                },
                {
                    "upsert": true
                })
            res.send({ result: result, accessToken: accessToken })
            console.log(`${newUserEmail} is inserted`);
        })
        // ============== Products==================
        app.get('/allProducts', async (req, res) => {
            const query = {};
            const limit = parseInt(req.query?.limit);
            const result = await productsCollection.find(query).limit(limit).toArray();
            res.send(result);
            console.log(`${limit} products are responding`);
        })
        // read all specific user's Products===============================
        app.get('/products', verifyJWT, async (req, res) => {
            const email = req?.decoded?.email;
            const query = { supplier: email };
            const result = await productsCollection.find(query).toArray();
            res.send(result);
            console.log(`${email} products are responding`);
        })
        // read specific product-------
        app.get('/product', async (req, res) => {
            const id = req.query.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.findOne(query);
            res.send(result);
            console.log(`${id} product is responding`);
        })
        // update a product data--------
        app.put('/product', async (req, res) => {
            const id = req.query.id;
            const query = { _id: ObjectId(id) };
            const newData = req.body;
            const update = {
                $set: newData
            }
            const result = await productsCollection.updateOne(query, update);

            res.send(result);
            console.log(`${id} is updated`);
        })
        // delete a product--------
        app.delete('/product', async (req, res) => {
            const id = req.query.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
            console.log(`${id} is deleted`);
        })
        // ================Add new product=======================
        app.post('/addProduct', async (req, res) => {
            const newData = req.body;
            const result = await productsCollection.insertOne(newData);
            res.send(result);
            console.log(`New product added`);
        })

        // initial response =========================================
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



