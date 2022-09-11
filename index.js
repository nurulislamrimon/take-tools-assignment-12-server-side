const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.Stripe_Secret_Key);


// middleware============
app.use(cors());
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.trpf6.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const run = async () => {
    client.connect();
    try {
        const usersCollection = client.db("usersCollection").collection("user");
        const bannerCollection = client.db("bannerCollection").collection("banner");
        const productsCollection = client.db("productsCollection").collection("product")
        const orderCollection = client.db("orderCollection").collection("orderedProduct");
        const reviewsCollection = client.db("reviewsCollection").collection("review");


        // middleware for verification==========================
        // JsonWebToken verification-------
        const verifyJWT = (req, res, next) => {
            const accessToken = req?.headers?.authentication;
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
        // ===============banner=======================
        app.get('/banners', async (req, res) => {
            const limit = parseInt(req.query.limit);
            const query = {};
            const result = await bannerCollection.find(query).limit(limit).toArray();
            res.send(result);
            console.log('banners are responsing');
        })
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
        // admin user crud=====================
        // get all user information---------
        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {}
            const result = await usersCollection.find(query).toArray();
            res.send(result);
            console.log(`all user is responding`);
        })
        // add an admin---------------
        app.put('/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const newAdmin = req.params.email;
            const query = { email: newAdmin };
            const result = await usersCollection.updateOne(query, {
                $set: { role: 'admin' }
            })
            res.send(result)
            console.log(`${newAdmin} is assigned to admin`);
        })
        // remove an admin---------------
        app.put('/removeAdmin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const newAdmin = req.params.email;
            const query = { email: newAdmin };
            const result = await usersCollection.updateOne(query, {
                $set: { role: 'member' }
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
        // ==============Admin products and orders Crud operation=============
        app.get('/manageProducts', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {};
            const result = await productsCollection.find(query).toArray();
            res.send(result);
            console.log(`manage products are responding`);
        })

        // update a product data--------
        app.put('/product', verifyJWT, verifyAdmin, async (req, res) => {
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
        app.delete('/product', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.query.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
            console.log(`${id} is deleted`);
        })
        // Add new product--------------
        app.post('/addProduct', verifyJWT, verifyAdmin, async (req, res) => {
            const newData = req.body;
            const result = await productsCollection.insertOne(newData);
            res.send(result);
            console.log(`New product added`);
        })
        // get all orders---------
        app.get('/orderItems', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {}
            const result = await orderCollection.find(query).toArray();
            res.send(result);
            console.log(`all orders responding`);
        })
        app.patch('/status', async (req, res) => {
            const id = req.body.id;
            const query = { _id: ObjectId(id) }
            const result = await orderCollection.updateOne(query, { $set: { shipped: true } });

            res.send(result)
            console.log('status changed');
        })

        // ============= Client====================
        // add an item on cart------
        app.post('/orderItem', verifyJWT, async (req, res) => {
            const newCart = req.body;
            const result = await orderCollection.insertOne(newCart);
            res.send(result)
            console.log(`new product is added to cart`);
        })
        // get user orders---------
        app.get('/orderItems/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const userEmail = req.decoded.email;
            if (email !== userEmail) {
                return res.status(403).send({ message: 'unauthorized access' })
            }
            const query = { customer: email }
            const result = await orderCollection.find(query).toArray();
            res.send(result);
            console.log(`${email} carted items responding`);
        })
        // delete an item from cart
        app.delete('/orderItem', verifyJWT, async (req, res) => {
            const id = req.query.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result)
            console.log(`${id} has been deleted`);
        })
        // get a specific item from cart
        app.get('/orderItem/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.send(result)
            console.log(`${id} is responding`);
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
        // =============Payment==================
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { totalPrice } = req.body;
            const amount = parseInt(totalPrice) * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })
            res.send({
                clientSecret: paymentIntent.client_secret
            })
            console.log('Payment intent is responding')
        })
        app.patch('/payment/:id', verifyJWT, async (req, res) => {
            const { trxId } = req.body;
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                paid: true,
                trxId: trxId
            }
            const result = await orderCollection.updateOne(filter, { $set: updateDoc })
            res.send(result)
            console.log('Payment successfully added on db');
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



