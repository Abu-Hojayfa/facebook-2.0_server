const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
const ObjectId = require("mongodb").ObjectId;

require("dotenv").config();

app.use(express.json());
app.use(cors());

const name = process.env.DB_NAME;
const pass = process.env.DB_PASS;
const db = process.env.DB_DATABASE;

const { MongoClient } = require("mongodb");
const uri = `mongodb+srv://${name}:${pass}@cluster0.mlbhe.mongodb.net/${db}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// mongo Db

client.connect((error) => {
  const allPost = client.db(`${db}`).collection("posts");

  // post related
  app.get("/allposts", (req, res) => {
    allPost.find({}).toArray((err, doc) => {
      res.send(doc);
    });
  });

  app.post("/doapost", (req, res) => {
    const data = req.body;
    allPost.insertOne(data).then((response) => res.send("okay good"));
  });

  // get posts by usermail
  app.get("/userpost", (req, res) => {
    const email = req._parsedUrl.query;
    allPost.find({ email: email }).toArray((err, doc) => {
      res.send(doc);
    });
  });

  // add a react to a post
  app.post("/addreact", (req, res) => {
    const data = req.body;
    allPost.findOneAndUpdate(
      { _id: ObjectId(`${data._id}`) },
      { $set: { reacts: data.reacts } }
    );
  });

  // writingCmnt
  app.post("/writecmnt", (req, res) => {
    const data = req.body;
    allPost
      .findOneAndUpdate(
        { _id: ObjectId(`${data.id}`) },
        { $push: { comments: data.mainData } }
      )
      .then((response) => {
        let pastComments = response.value.comments;
        const newComment = data.mainData;
        pastComments = [...pastComments, newComment];
        res.send(pastComments);
      });
  });
});

// firebase users
const functions = require("firebase-functions");
const admin = require("firebase-admin");

app.get("/users", (req, res) => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }

  const listAllUsers = (nextPageToken) => {
    admin
      .auth()
      .listUsers(1000, nextPageToken)
      .then((listUsersResult) => {
        res.send(listUsersResult.users);

        if (listUsersResult.pageToken) {
          // List next batch of users.
          listAllUsers(listUsersResult.pageToken);
        }
      })
      .catch((error) => {
        console.log("Error listing users:", error);
      });
  };
  listAllUsers();
});

app.listen(port, () => console.log(`Running on ${port}`));
