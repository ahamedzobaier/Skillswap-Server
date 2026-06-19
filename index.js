const express = require('express');
const app = express()
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


app.use(cors())
app.use(express.json())
require('dotenv').config()

const port = process.env.PORT || 5000


const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db('skillswap_db');
    const postTasksCollection = db.collection('posts');
    const proposalsCollection = db.collection('proposals')

    // Post Task api
    app.post('/api/tasks', async (req, res) => {
      const post = req.body;
      const result = await postTasksCollection.insertOne(post);
      res.send(result);
    });

    // Get Task api
    app.get('/api/task', async(req, res) => {
        const query = {};
        if(req.query.clientId){
            query.clientId = req.query.clientId;
        }
        if(req.query.status){
            query.status = req.query.status;
        }
        const cursor = postTasksCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
    })

    // get single task api
    app.get("/api/tasks/:id",  async (req, res) => {
      const { id } = req.params;
      const result = await postTasksCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Post Proposal api
    app.post('/api/proposals', async(req, res) => {
      const proposal = req.body;
      const result = await proposalsCollection.insertOne(proposal)
      res.send(result)
    })

    //get proposal api
    app.get('/api/proposals', async(req, res) => {
      const query = {};
        if(req.query.taskId){
            query.taskId = req.query.taskId;
        }
        if(req.query.freelancerEmail){
            query.freelancerEmail = req.query.freelancerEmail;
        }
        const cursor = proposalsCollection.find(query);
        const result = await cursor.toArray();
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
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})