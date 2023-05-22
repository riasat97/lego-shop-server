const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// express middleware
app.use(cors());
app.use(express.json());

//Mongo Connection URL
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.g8xlopp.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Json Web Token Implimentation
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    const token = authorization.split(' ')[1];

    //generate access token secret using node command: require('crypto').randomBytes(64).toString('hex')
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        //await client.connect();

        const categoryCollection = client.db('legoShop').collection('categories');
        const toyCollection = client.db('legoShop').collection('toys');
        // jwt token generation
        app.post('/jwt', (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            console.log(token);
            res.send({ token });
        })

        // get all categories routes
        app.get('/categories', async (req, res) => {
            const cursor = categoryCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        //get all toys by category id    
        app.get('/categories/:id', async (req, res) => {
            const id = req.params.id;
            const query = { category: id }
            console.log(query);
            const options = {
                projection: { name: 1, price: 1, quantity: 1, pictureUrl: 1 },
            };

            const result = await toyCollection.find(query).toArray();
            res.send(result);
        })


        // toys routes
        app.get('/toys', async (req, res) => {

            let query = {};
            if (req.query?.search && req.query?.user_id) {
                const searchRegex = new RegExp(req.query.search, 'i');
                query = { name: { $regex: searchRegex }, user_id: req.query.user_id };
            }
            else if(req.query?.user_id){
                query = { user_id: req.query.user_id };
            }
            else if (req.query?.search) {
                const searchRegex = new RegExp(req.query.search, 'i');
                query = { name: { $regex: searchRegex } };
            }
            const sort= req.query?.sort?(req.query.sort==='asc')?{price:1}:{price:-1}:{ _id: -1 };
            const options = {
                sort: sort,
                // Include only the `title` and `imdb` fields in each returned document
                projection: { sellerName: 1,name: 1,category: 1, price: 1, quantity: 1  },
            };
            const result = await toyCollection.find(query,options).limit(20).toArray();
            res.send(result);
        })
        // app.get('/toys/:id', verifyJWT, async (req, res) => {
        //     const decoded = req.decoded;
        //     console.log('came back after verify', decoded)

        //     if (decoded.email !== req.query.email) {
        //         return res.status(403).send({ error: 1, message: 'forbidden access' })
        //     }

        //     let query = {};
        //     if (req.query?.email) {
        //         query = { email: req.query.email }
        //     }
        //     const result = await toyCollection.find(query).toArray();
        //     res.send(result);
        // })

        app.get('/toys/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await toyCollection.findOne(query);
            res.send(result);
        });

        app.post('/toys', async (req, res) => {
            const toys = req.body;
            console.log(toys);
            const result = await toyCollection.insertOne(toys);
            res.send(result);
        });

        app.patch('/toys/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedToys = req.body;
            console.log(updatedToys);
            const updateDoc = {
                $set: {
                    price: updatedToys.price,
                    quantity: updatedToys.quantity,
                    description: updatedToys.description
                },
            };
            const result = await toyCollection.updateOne(filter, updateDoc);
            query = { user_id: updatedToys.user_id };
            const toys = await toyCollection.find(query).limit(20).toArray();
            res.send(toys);
        })

        app.delete('/toys/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await toyCollection.deleteOne(query);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('LeGo Shop is running')
})

app.listen(port, () => {
    console.log(`LeGo Shop is running on port ${port}`)
})