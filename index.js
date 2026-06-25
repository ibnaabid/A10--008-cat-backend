const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();

const jose = require('jose-cjs');

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
    const feedbackCollection = db.collection("rejectionFeedbacks"); 

                      // jwt korar jnno useabale for tenat"///node_modules
      

const jwks = jose.createRemoteJWKSet (
  new URL(
    `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/auth/jwks`
  )
);
``
const tenantVerify = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;


    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).send({
        message: "Unauthorized",
      });
    }
    const token = auth.split(" ")[1];
    
  // console.log("token",token.token)
  

    const { payload } = await jose.jwtVerify(token, jwks);
    // console.log("payload",payload)



    // role check
    if (payload.role !== "tenant") {
      return res.status(403).send({
        message: "Tenant Access Only",
      });
    }

    next();
  } catch (error) {
    return res.status(401).send({
      message: "Invalid Token",
    });
  }
};

// admin ar jwt protector

const ownerVerify = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;


    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).send({
        message: "Unauthorized",
      });
    }
    const token = auth.split(" ")[1];
    
  console.log("token",token)
  

    const { payload } = await jose.jwtVerify(token, jwks);
    console.log("payload",payload)



    // role check
    if (payload.role !== "owner") {
      return res.status(403).send({
        message: "owner Access Only",
      });
    }

    next();
  } catch (error) {
    return res.status(401).send({
      message: "Invalid Token",
    });
  }
};




















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
app.get("/Bookings",tenantVerify, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;

    const skip = (page - 1) * limit;

    const total = await bookingProperty.countDocuments();

    const data = await bookingProperty
      .find()
      .skip(skip)
      .limit(limit)
      .toArray();

    res.send({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      message:
        "API PROTECTED"
      
    });
  } catch (error) {
    res.status(500).send({
      message: "Server Error",
      error: error.message,
    });
  }
});



// allhome a pagination
app.get("/allhome",ownerVerify, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;

    const skip = (page - 1) * limit;

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

    let cursor = collection.find(query);

    if (sort === "low") {
      cursor = cursor.sort({ price: 1 });
    }

    if (sort === "high") {
      cursor = cursor.sort({ price: -1 });
    }

    const total = await collection.countDocuments(query);

    const data = await cursor
      .skip(skip)
      .limit(limit)
      .toArray();

    res.send({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch properties",
      error: error.message,
    });
  }
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

    app.delete("/allhome/:id",ownerVerify, async (req, res) => {
      try {
        const { id } = req.params;
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Delete failed" });
      }
    });

    app.patch("/allhome/:id",ownerVerify, async (req, res) => {
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
      status: "Rejected",
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
    console.log(result)
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

    app.get("/favorites",tenantVerify, async (req, res) => {
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

//     // filter btn allhome ar jnno 
// app.get("/allhome", async (req, res) => {
//   try {
//     const { location, propertyType, sort } = req.query;

//     let query = {};

//     if (location) {
//       query.location = {
//         $regex: location,
//         $options: "i",
//       };
//     }

//     if (propertyType) {
//       query.propertyType = propertyType;
//     }

//     let result = await collection.find(query).toArray();

//     if (sort === "low") {
//       result.sort((a, b) => Number(a.price) - Number(b.price));
//     } else if (sort === "high") {
//       result.sort((a, b) => Number(b.price) - Number(a.price));
//     }

//     res.send(result);
//   } catch (error) {
//     res.status(500).send({
//       message: "Failed to fetch properties",
//       error: error.message,
//     });
//   }
// });

await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});