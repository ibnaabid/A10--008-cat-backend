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
    const usercollection = db.collection("user");
    const collection = db.collection("addProperties");
    const bookingProperty = db.collection("bookingHouse");
    const favoriteProperty = db.collection("favourite");
    const reviewSystem = db.collection("reviews");
    const feedbackCollection = db.collection("rejectionFeedbacks"); // রিজেকশনের কারণ রাখার জন্য নতুন কালেকশন

    // ---------- Reviews ----------
    app.post("/reviews", async (req, res) => {
      const body = req.body;
      const result = await reviewSystem.insertOne(body);
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const result = await reviewSystem.find().toArray();
      res.send(result);
    });

    // pagination for booking apage;

   app.get("/Bookings", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;

    const skip = (page - 1) * limit;

    const data = await collection
      .find()
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await bookingProperty.countDocuments();

    res.send({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    res.status(500).send({ message: "Server Error", error });
  }
});

// allhome a pagination
app.get("/allhome", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;

    const skip = (page - 1) * limit;

    const data = await collection
      .find()
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await collection.countDocuments();

    res.send({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    res.status(500).send({ message: "Server Error", error });
  }
});

    










    // ---------- Properties & Admin Actions ----------

    // ১. হোমে ফিল্টার করা ডেটা পাওয়ার জন্য
    app.get("/allhome/filter", async (req, res) => {
      try {
        const { location, type, minPrice, maxPrice } = req.query;
        const filter = { status: "accepted" };

        if (location) {
          filter.location = { $regex: location, $options: "i" };
        }
        if (type && type !== "Any Type") {
          filter.type = type;
        }
        if (minPrice || maxPrice) {
          filter.price = {
            ...(minPrice && { $gte: Number(minPrice) }),
            ...(maxPrice && { $lte: Number(maxPrice) }),
          };
        }

        const homes = await collection.find(filter).toArray();
        res.json(homes);
      } catch (error) {
        res.status(500).json({ message: "Server error" });
      }
    });

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
      try {
        const { id } = req.params;
        const result = await collection.findOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Fetch failed" });
      }
    });

    app.delete("/allhome/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Delete failed" });
      }
    });

    app.patch("/allhome/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = req.body; // ফ্রন্টএন্ড থেকে যা পাঠানো হবে তাই আপডেট হবে

        const result = await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Update failed" });
      }
    });
//  reejact feddback show

   app.post("/reject-feedback/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const feedbackData = {
      homeId: new ObjectId(id),
      feedback: req.body.feedback,
      status: "rejected",
      createdAt: new Date(),
    };

    const result = await feedbackCollection.insertOne(feedbackData);

    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to save feedback" });
  }
});


app.get("/reject-feedback", async (req, res) => {
  try {
    const result = await feedbackCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: "Failed to get feedback" });
  }
});



app.get("/reject-feedback/:id", async (req, res) => {
  const {id} = req.params
  const result = await feedbackCollection.findOne({
    homeId : new ObjectId(id)
  })
  res.send(result);
});
    // ---------- Bookings ----------
    app.post("/Bookings", async (req, res) => {
      try {
        const { sessionId } = req.body;
        if (!sessionId) return res.status(400).send({ error: "SessionId missing" });

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
        return res.status(201).send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    app.get("/Bookings/:session_id", async (req, res) => {
      try {
        const { session_id } = req.params;
        const booking = await bookingProperty.findOne({ transactionId: session_id });
        if (!booking) return res.send({ exists: false });
        return res.send({ exists: true, booking });
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    app.get("/Bookings", async (req, res) => {
      const result = await bookingProperty.find().toArray();
      res.send(result);
    });

    app.patch("/Bookings/:id", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;
      const result = await bookingProperty.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } }
      );
      res.json(result);
    });

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
        if (!userId) return res.status(400).json({ error: "userId is required" });

        const result = await favoriteProperty.find({ userId: new ObjectId(userId) }).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch favorites" });
      }
    });

    app.get("/favorites", async (req, res) => {
      const result = await favoriteProperty.find().toArray();
      res.send(result);
    });

    app.delete("/favorites/:id", async (req, res) => {
      const { id } = req.params;
      const result = await favoriteProperty.deleteOne({ _id: new ObjectId(id) });
      res.json(result);
    });

    // ---------- Users ----------
    app.get("/user", async (req, res) => {
      const result = await usercollection.find().toArray();
      res.send(result);
    });

    app.patch("/user/:id", async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;
      const result = await usercollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } }
      );
      res.send(result);
    });

    // filter btn allhome ar jnno 
app.get("/allhome", async (req, res) => {
  try {
    const { location, propertyType, sort } = req.query;

    let query = {};

    if (location) {
      query.location = {
        $regex: location,
        $options: "i",
      };
    }

    if (propertyType) {
      query.propertyType = propertyType;
    }

    let result = await collection.find(query).toArray();

    if (sort === "low") {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sort === "high") {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    }

    res.send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch properties",
      error: error.message,
    });
  }
});

await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});