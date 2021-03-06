const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, MongoRuntimeError, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jqr5txr.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}





async function run() {
  try {
    await client.connect();
    const itemCollection = client.db('circuit_city').collection('items');
    const userCollection = client.db('circuit_city').collection('users');
    const orderCollection = client.db('circuit_city').collection('orders');
    const reviewCollection = client.db('circuit_city').collection('reviews');



    app.get('/item', async (req, res) => {
      const query = {};
      const cursor = itemCollection.find(query);
      const items = await cursor.limit(6).toArray();
      res.send(items);
    });

    app.post('/item', async (req, res) => {
      console.log(req.body)
      const newItem = req.body;
      const result = await itemCollection.insertOne(newItem);
      res.send(result);
  });


  app.post('/review', async (req, res) => {
    console.log(req.body)
    const newReview = req.body;
    const result = await reviewCollection.insertOne(newReview);
    res.send(result);
});


    app.get('/order', verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email === decodedEmail) {
        const query = { email: email }
        const order = await orderCollection.find(query).toArray();
        return res.send(order);
      } else {
        return res.status(403).send({ message: 'forbidden access' });
      }


    })



    app.post('/orders',verifyJWT, async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    })



    app.get('/user', verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });


    app.get('/admin/:email', async(req, res) =>{
      const email = req.params.email;
      const user = await userCollection.findOne({email: email});
      const isAdmin = user.role === 'admin';
      res.send({admin: isAdmin})
    })







    app.put('/user/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {

        const filter = { email: email };
        const updateDoc = {
          $set: { role: 'admin' },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);

      }

      else {
        res.status(403).send({ message: 'forbidden' });
      }


    });





    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ result, token });

    });



    app.get('/item/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const item = await itemCollection.findOne(query);
      res.send(item);
    })

  }
  finally {

  }

}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from circuit-city')
})

app.listen(port, () => {
  console.log(`circuit-city listening on port ${port}`)
})