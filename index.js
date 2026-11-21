
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from 'mongodb';
import dns from "node:dns";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

// const client = new MongoClient(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.wjo89lz.mongodb.net/`);


// Local DNS fix: Node must use the working DNS server (configured in .env).
if (process.env.DNS_SERVER) {
  dns.setServers([process.env.DNS_SERVER]);
}

const uri = `mongodb+srv://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASSWORD)}@cluster0.wjo89lz.mongodb.net/`;

const client = new MongoClient(uri);

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("MongoDB Connected Successfully!");
    return client;
  } catch (error) {
    console.error("MongoDB Connection Failed:", error);
    process.exit(1);
  }
};

const connectedClient = await connectToMongoDB();
const database = connectedClient.db("hireloopdb");
const user = database.collection("user");
const jobs = database.collection("jobs");


app.get("/", (req, res) => {
  res.send("HireLoop is running");
});


app.get('/user', async (req, res) => {
  const cursor = user.find({});
  const result = await cursor.toArray();
  res.send(result);
});

//jobs related api
// app.post('/jobs', async (req,res) => {
// const job = req.body;
// const result = await jobs.insertOne(job);
// res.send(result);
// });

// app.get('/jobs', async (req, res) => {
//   const cursor = jobs.find();
//   const result = await cursor.toArray();
//   res.send(result);
// })

// // FIX: GET /jobs was missing entirely, which is why the frontend received 404.
// This reads the same `jobs` collection used by the POST route; no new
// collection or duplicate API was introduced.
// (Superseded by the GET /jobs route below; kept commented to avoid duplicates.)
// app.get('/jobs', async (req, res) => {
//   try {
//     const cursor = jobs.find({}).sort({ _id: -1 });
//     const result = await cursor.toArray();
//     res.send(result);
//   } catch (error) {
//     console.error("Job Read Error:", error);
//     res.status(500).send({ message: "Failed to load jobs" });
//   }
// });

// Old POST block — fully commented out so it cannot leave an unclosed function.
// app.post('/jobs', async (req, res) => {
//   try {
//     const job = req.body;
//     const result = await jobs.insertOne(job);
//     res.status(201).send(result);
//   } catch (error) {
//     console.error("Job Insert Error:", error);
//     res.status(500).send({ message: "Failed to create job" });
//   }
// });



// GET: MongoDB থেকে সব Job নিয়ে আসবে
app.get("/jobs", async (req, res) => {
  try {
    const result = await jobs.find().sort({ _id: -1 }).toArray();
    res.status(200).send(result);
  } catch (error) {
    console.error("Get Jobs Error:", error);
    res.status(500).send({ message: "Failed to fetch jobs" });
  }
});

// POST: নতুন Job MongoDB-তে Save করবে
app.post("/jobs", async (req, res) => {
  try {
    const job = req.body;

    if (!job || typeof job !== "object" || Array.isArray(job)) {
      return res.status(400).send({ message: "Invalid job data" });
    }

    const result = await jobs.insertOne({
      ...job,
      createdAt: new Date(),
    });

    res.status(201).send({
      message: "Job created successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Job Insert Error:", error);
    res.status(500).send({ message: "Failed to create job" });
  }
});

// PATCH: Update one existing job. Used by the recruiter edit page and the
// admin approve/reject actions, so those screens no longer rely on demo data.
// NOTE: this route still needs authenticated role checks before production;
// the current Express app has no better-auth session verification yet.
app.patch("/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid job ID" });
    }

    const updates = req.body;

    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      return res.status(400).send({ message: "Invalid job data" });
    }

    // Never let a client replace the MongoDB identity fields.
    delete updates._id;
    delete updates.createdAt;

    const result = await jobs.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Job not found" });
    }

    res.status(200).send({ message: "Job updated successfully" });
  } catch (error) {
    console.error("Job Update Error:", error);
    res.status(500).send({ message: "Failed to update job" });
  }
});

// DELETE: MongoDB থেকে Job Delete করবে
app.delete("/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid job ID" });
    }

    const result = await jobs.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Job not found" });
    }

    res.status(200).send({ message: "Job deleted successfully" });
  } catch (error) {
    console.error("Job Delete Error:", error);
    res.status(500).send({ message: "Failed to delete job" });
  }
});



app.listen(port, () => {
  console.log(`HireLoop is running on port ${port}`);
});
