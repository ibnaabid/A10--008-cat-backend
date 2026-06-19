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
    const favoriteProperty = db.collection("favourite")


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
    

app.post("/Bookings", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).send({ error: "SessionId missing in request body" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).send({ error: "Session not found on Stripe" });
    }
    const bookingPropertyhouse = {
      propertyId:    session.metadata?.propertyId || "N/A",
      propertyTitle: session.metadata?.propertyName || "N/A",
      tenantEmail:   session.metadata?.userEmail || session.customer_details?.email,
      moveInDate:    session.metadata?.moveInDate || null,
      phone:         session.metadata?.phone || "N/A",
      notes:         session.metadata?.notes || "",
      bookingAmount: session.amount_total ? session.amount_total / 100 : 0,
      transactionId: session.id,
      paymentStatus: session.payment_status === "paid" ? "Paid" : "Pending",
      bookingStatus: "Confirmed", 
      createdAt:     new Date(),
    };

    const result = await bookingProperty.insertOne(bookingPropertyhouse);

    res.status(201).send({
      success: true,
      insertedId: result.insertedId,
    });

  } catch (error) {
    console.error("Booking error in backend:", error);
    res.status(500).send({ error: error.message });
  }
});

// property favourite korle oita dkhaar jnnno

app.post("/favorites/:userId",async(req,res)=>{
  const {userId} = req.params
  const {title,name,propertyId} = req.body;
  const find = await favoriteProperty.insertOne({
        userId: new ObjectId(userId),
      propertyId: new ObjectId(propertyId),
      title,
      name,
      description,
      createdAt: new Date(),

  })
  res.json(find)
})

app.get("/favorites",async(req,res)=>{
  const result = await favoriteProperty.find().toArray();
  res.json(result)
})


// favourite data delete mane non-favour;
app.delete("/favorites/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await favoriteProperty.deleteOne({
      userId: new ObjectId(userId),
    });

    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Delete failed" });
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