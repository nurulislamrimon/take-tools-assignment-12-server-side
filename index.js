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
        const usersCollection = client.db("usersCollection").collection("user");
        const productsCollection = client.db("productsCollection").collection("product")
        const orderCollection = client.db("orderCollection").collection("orderedProduct")
        const reviewsCollection = client.db("reviewsCollection").collection("review")


        // middleware for verification==========================
        // JsonWebToken verification-------
        const verifyJWT = (req, res, next) => {
            const accessToken = req?.headers?.bearer;
            if (!accessToken) {
                return res.status(401).send({ message: 'Unauthorized access' })
            }
            jwt.verify(accessToken, process.env.JWT_Secret, function (err, decoded) {
                if (err) {
                    return res.status(401).send({ message: 'Unauthrized access' });
                }
                req.decoded = decoded;
                next();
            })
        }

        // admin verification------------
        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const query = { email: requester };
            const result = await usersCollection.findOne(query);
            if (result?.role === 'admin') {
                next();
            } else {
                res.status(401).send('unauthorized access');
            }
        }

        // ===============user======================
        // upsert user---------------
        app.put('/user', async (req, res) => {
            const newUserEmail = req.body.email;
            const newUser = req.body;

            const accessToken = jwt.sign({ email: newUserEmail }, process.env.JWT_Secret, { expiresIn: '1d' });
            const result = await usersCollection.updateOne(
                {
                    "email": newUserEmail
                },
                {
                    "$set": newUser
                },
                {
                    "upsert": true
                })
            res.send({ result: result, accessToken: accessToken })
            console.log(`${newUserEmail} is inserted`);
        })
        // get user information
        app.get('/user/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await usersCollection.findOne(query);
            res.send(result);
            console.log(`${email} information is responding`);
        })
        // update user information---------------
        app.put('/updateUser/:email', verifyJWT, async (req, res) => {
            const userEmail = req.params.email;
            const updateData = req.body;

            const result = await usersCollection.updateOne(
                {
                    "email": userEmail
                },
                {
                    "$set": updateData
                },
                {
                    upsert: true
                })
            res.send(result)
            console.log(`${userEmail} is updated`);
        })
        // get all user information
        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {}
            const result = await usersCollection.find(query).toArray();
            res.send(result);
            console.log(`all user is responding`);
        })
        // admin-------------------
        app.put('/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const newAdmin = req.params.email;
            const query = { email: newAdmin };
            const result = await usersCollection.updateOne(query, {
                $set: { role: 'admin' }
            })
            res.send(result)
            console.log(`${newAdmin} is assigned to admin`);
        })
        // ============== Products==================
        app.get('/allProducts', async (req, res) => {
            const query = {};
            const limit = parseInt(req.query?.limit);
            const result = await productsCollection.find(query).limit(limit).toArray();
            res.send(result);
            console.log(`${limit} products are responding`);
        })
        // read specific product-------
        app.get('/product', async (req, res) => {
            const id = req.query.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.findOne(query);
            res.send(result);
            console.log(`${id} product is responding`);
        })
        // ==============Admin Crud operation=============
        app.get('/manageProducts', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const result = await productsCollection.find(query).toArray();
            res.send(result);
            console.log(`manage products are responding`);
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
        app.delete('/product', verifyJWT, async (req, res) => {
            const id = req.query.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
            console.log(`${id} is deleted`);
        })
        // Add new product--------------
        app.post('/addProduct', async (req, res) => {
            const newData = req.body;
            const result = await productsCollection.insertOne(newData);
            res.send(result);
            console.log(`New product added`);
        })

        // ============= Client====================
        // add an item on cart------
        app.put('/orderItem', verifyJWT, async (req, res) => {
            const productId = req.body?.productId;
            const query = { productId: productId }
            const newCart = { $set: req.body };
            const result = await orderCollection.updateOne(query, newCart, { upsert: true });
            res.send(result)
            console.log(`${productId} is added to cart`);
        })
        // get all carted items---------
        app.get('/orderItems/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const userEmail = req.decoded;
            // if (email !== userEmail) {
            //     return res.status(403).send({ message: 'unauthorized access' })
            // }
            const query = { customer: email }
            const result = await orderCollection.find(query).toArray();
            res.send(result);
            console.log(`${email} carted items responding`);
        })
        // delete a item from cart
        app.delete('/cartItem', async (req, res) => {
            const id = req.query.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result)
            console.log(`${id} has been deleted`);
        })
        // add review-------------------
        app.post('/review', async (req, res) => {
            const newReview = req.body;
            const result = await reviewsCollection.insertOne(newReview);
            res.send(result)
            console.log('New review added');
        })
        // get reviews---------------------
        app.get('/review', async (req, res) => {
            const limit = parseInt(req.query.limit);
            const query = {};
            const result = await reviewsCollection.find(query).limit(limit).toArray();
            res.send(result)
            console.log(`${limit} reviews are responding`);
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



