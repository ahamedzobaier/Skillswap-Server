const express = require('express');
const app = express()
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { verifySession, requireRole } = require('./authMiddleware');

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
}))
app.use(express.json())
require('dotenv').config()

const port = process.env.PORT || 5000
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const db = client.db('skillswap_db');
    app.locals.db = db; // expose db to middleware
    
    const tasksCollection = db.collection('tasks');
    const proposalsCollection = db.collection('proposals');
    const usersCollection = db.collection('user'); // Better Auth uses 'user' collection

    // --- TASKS API ---

    // POST /api/tasks (Client only)
    app.post('/api/tasks', verifySession, requireRole('client'), async (req, res) => {
      const task = {
        ...req.body,
        client_email: req.user.email,
        status: 'open',
        createdAt: new Date()
      };
      const result = await tasksCollection.insertOne(task);
      res.send(result);
    });

    // GET /api/tasks (Public)
    app.get('/api/tasks', async(req, res) => {
        const { search, category, clientId, status, page = 1, limit = 9 } = req.query;
        
        const query = {};
        if (clientId) query.clientId = clientId;
        if (status) query.status = status;
        if (category && category !== 'All') query.category = category;
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const cursor = tasksCollection.find(query).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 });
        const result = await cursor.toArray();
        const total = await tasksCollection.countDocuments(query);
        
        res.send({ tasks: result, total, page: parseInt(page), limit: parseInt(limit) });
    });

    // GET /api/tasks/:id
    app.get("/api/tasks/:id", async (req, res) => {
      const { id } = req.params;
      const result = await tasksCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });
    
    // PUT /api/tasks/:id (Edit task)
    app.put("/api/tasks/:id", verifySession, async (req, res) => {
      const { id } = req.params;
      const updates = req.body;
      const result = await tasksCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updates }
      );
      res.send(result);
    });

    // DELETE /api/tasks/:id
    app.delete("/api/tasks/:id", verifySession, async (req, res) => {
      const { id } = req.params;
      const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // --- PROPOSALS API ---

    // POST /api/proposals (Freelancer only)
    app.post('/api/proposals', verifySession, requireRole('freelancer'), async(req, res) => {
      const proposal = {
          ...req.body,
          freelancer_email: req.user.email,
          status: 'pending',
          submitted_at: new Date()
      };
      const result = await proposalsCollection.insertOne(proposal);
      res.send(result);
    });

    // GET /api/proposals
    app.get('/api/proposals', verifySession, async(req, res) => {
        const { taskId, freelancerEmail } = req.query;
        const query = {};
        if(taskId) query.task_id = taskId;
        if(freelancerEmail) query.freelancer_email = freelancerEmail;
        
        const cursor = proposalsCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
    });
    
    // PUT /api/proposals/:id (Client accept/reject)
    app.put("/api/proposals/:id", verifySession, async (req, res) => {
      const { id } = req.params;
      const { status } = req.body; // 'accepted' or 'rejected'
      
      const result = await proposalsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
      );
      
      if (status === 'accepted') {
          const proposal = await proposalsCollection.findOne({ _id: new ObjectId(id) });
          if (proposal) {
              await tasksCollection.updateOne(
                  { _id: new ObjectId(proposal.task_id) },
                  { $set: { status: 'In Progress' } }
              );
              await proposalsCollection.updateMany(
                  { task_id: proposal.task_id, _id: { $ne: new ObjectId(id) } },
                  { $set: { status: 'rejected' } }
              );
          }
      }
      res.send(result);
    });

    // --- USERS API ---
    
    // GET /api/users
    app.get("/api/users", async (req, res) => {
       const query = {};
       if (req.query.role) query.role = req.query.role;
       const result = await usersCollection.find(query).toArray();
       res.send(result);
    });
    
    // GET /api/users/:email
    app.get("/api/users/:email", async (req, res) => {
       const result = await usersCollection.findOne({ email: req.params.email });
       res.send(result);
    });
    
    // PUT /api/users/:email (Update Profile)
    app.put("/api/users/:email", verifySession, async (req, res) => {
       const updates = req.body;
       const result = await usersCollection.updateOne(
           { email: req.params.email },
           { $set: updates }
       );
       res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Skillswap Server Running')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})