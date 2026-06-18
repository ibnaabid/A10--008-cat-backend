const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const app = express();

const port = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send(" Server is Running! ");
});

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
    await client.connect();

    const db = client.db("HouseRent");
    const collection = db.collection("addProperties")
    const bookingProperty = db.collection("bookingHouse")


    // properti data dkhar jnno
   
    app.get("/allhome",async(req,res)=>{
      const result = await collection.find().toArray();
      res.send(result)
    })


    app.post("/allhome",async(req,res)=>{
      const body = req.body;
      const result = await collection.insertOne(body);
      res.send(result)
    })

    // dynamic property data dkhbo single data :

    app.get("/allhome/:id",async(req,res)=>{
      const {id} = req.params;
      const result = await collection.findOne({
      _id: new ObjectId(id)
      })
    res.send(result)
    })
    
    // booking korar jnno property

app.post("/booking", async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const booking = {
      propertyId: session.metadata.propertyId,
      propertyTitle: session.metadata.propertyName,

      tenantEmail: session.metadata.userEmail,
      moveInDate: session.metadata.moveInDate,
      phone: session.metadata.phone,
      notes: session.metadata.notes,

      bookingAmount: session.amount_total / 100,

      transactionId: session.id,

      paymentStatus: session.payment_status === "paid" ? "Paid" : "Pending",
      bookingStatus: "Pending",

      createdAt: new Date(),
    };

    const result = await bookingsCollection.insertOne(booking);

    res.send({
      success: true,
      insertedId: result.insertedId,
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});







    // property data delete korar jnno
 
app.delete("/allhome/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await collection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Delete failed" });
  }
});

// proprtty data update korar jnno

app.patch("/allhome/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Update failed" });
  }
});











    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})