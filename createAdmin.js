const { MongoClient } = require('mongodb');

const uri = "mongodb://skillswap:XD910N7ewVrhRPDP@ac-gzmu7rh-shard-00-00.807mzft.mongodb.net:27017,ac-gzmu7rh-shard-00-01.807mzft.mongodb.net:27017,ac-gzmu7rh-shard-00-02.807mzft.mongodb.net:27017/?ssl=true&replicaSet=atlas-wytf5h-shard-0&authSource=admin&appName=Cluster0";

async function createAdmin() {
  console.log("Signing up user via API...");
  
  try {
      const res = await fetch("http://localhost:3000/api/auth/sign-up/email", {
          method: "POST",
          headers: { 
              "Content-Type": "application/json",
              "Origin": "http://localhost:3000"
          },
          body: JSON.stringify({
              name: "Admin User",
              email: "admin@skillswap.com",
              password: "password123"
          })
      });
      
      const data = await res.json();
      console.log("Signup Response:", data);
  } catch (err) {
      console.error("Signup request failed:", err);
  }

  console.log("Connecting to MongoDB to set role to admin...");
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('skillswap_db');
    
    const result = await db.collection('user').updateOne(
        { email: "admin@skillswap.com" },
        { $set: { role: "admin" } }
    );
    
    console.log(`Matched ${result.matchedCount} document(s) and modified ${result.modifiedCount} document(s).`);
  } finally {
    await client.close();
  }
}

createAdmin().catch(console.error);
