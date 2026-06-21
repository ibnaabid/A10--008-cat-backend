const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();

const port = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send(" Server is Running! ");
});

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
    const collection = db.collection("addProperties");
    const bookingProperty = db.collection("bookingHouse");
    const favoriteProperty = db.collection("favourite");

    // ---------- Properties ----------

    app.get("/allhome", async (req, res) => {
      const result = await collection.find().toArray();
      res.send(result);
    });

    app.post("/allhome", async (req, res) => {
      const body = req.body;
      const result = await collection.insertOne(body);
      res.send(result);
    });

    app.get("/allhome/:id", async (req, res) => {
      const { id } = req.params;
      const result = await collection.findOne({
        _id: new ObjectId(id)
      });
      res.send(result);
    });

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

    // ---------- Bookings ----------

    app.post("/Bookings", async (req, res) => {
      try {
        const { sessionId } = req.body;

        if (!sessionId) {
          return res.status(400).send({ error: "SessionId missing" });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        const bookingPropertyhouse = {
          propertyId: session.metadata?.propertyId,
          propertyTitle: session.metadata?.propertyName,
          tenantEmail: session.metadata?.userEmail || session.customer_details?.email,
          moveInDate: session.metadata?.moveInDate,
          phone: session.metadata?.phone,
          notes: session.metadata?.notes || "",
          bookingAmount: session.amount_total / 100,
          transactionId: session.id,
          paymentStatus: session.payment_status,
          bookingStatus: "Confirmed",
          createdAt: new Date(),
        };

        const result = await bookingProperty.insertOne(bookingPropertyhouse);

        return res.status(201).send({
          success: true,
          insertedId: result.insertedId,
        });

      } catch (error) {
        console.error("Booking error:", error);
        res.status(500).send({ error: error.message });
      }
    });

    app.get("/Bookings/:session_id", async (req, res) => {
      try {
        const { session_id } = req.params;

        const booking = await bookingProperty.findOne({
          transactionId: session_id
        });

        if (!booking) {
          return res.send({ exists: false });
        }

        return res.send({ exists: true, booking });

      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    app.get("/Bookings",async(req,res)=>{
      const result = await bookingProperty.find().toArray();
      res.send(result)
    })

    // ---------- Favorites ----------

    app.post("/favorites/:userId", async (req, res) => {
      try {
        const { userId, title, name } = req.body;

        const newFavorite = {
          userId: new ObjectId(userId),
          title,
          name,
          createdAt: new Date()
        };

        const result = await favoriteProperty.insertOne(newFavorite);
        res.status(201).send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        res.status(500).send({ error: "Failed to add to favorites" });
      }
    });

    app.get("/favorites/:userId", async (req, res) => {
      try {
        const { userId } = req.params;

        if (!userId) {
          return res.status(400).json({ error: "userId is required" });
        }

        const result = await favoriteProperty
          .find({ userId: new ObjectId(userId) })
          .toArray();

        res.send(result);
      } catch (error) {
        console.error(error.message);
        res.status(500).send({ error: "Failed to fetch favorites" });
      }
    });


    app.get("/favorites",async(req,res)=>{
      const result = await favoriteProperty.find().toArray();
      res.send(result)
    })

app.delete("/favorites/:id", async (req, res) => {
  const { id } = req.params;

  const result = await favoriteProperty.deleteOne({
    _id: new ObjectId(id),
  });

  res.json(result);
});

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // client.close() ইচ্ছাকৃতভাবে call করা হয়নি, যাতে connection খোলা থাকে
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});