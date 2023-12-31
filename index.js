const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000;

//middleware
app.use(cors({
  origin:['http://localhost:5173'],
  credentials: true
}));
app.use(express.json())
app.use(cookieParser())


app.get('/', (req,res)=>{
    res.send('Car Doctor Is Running')
})

//Custom Middleware
const logger = async(req,res,next)=>{
  console.log('Called:', req.host, req.originalUrl);
  next()
}

const verifyToken=async(req,res,next)=>{
  const token = req.cookies?.token;
  console.log("value of token from middlware : ",token)

 
  // if(req.query?.email !== req.user?.email){
  //   return res.status(403).send({message:'Forbidden Access'})
  // }

  if(!token){
    return res.status(401).send({message: 'Not Authorized'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,async(err,decoded)=>{
    if(err){
      return res.status(401).send({message: 'Not Authorized'})
    }
    console.log("value in token (decoded) : ", decoded)
    req.user= decoded;
    next()
  })
}


//MongoDB


const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Password}@cluster0.x4cetjc.mongodb.net/?retryWrites=true&w=majority`;

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

    //create db
    const database = client.db("carDoctor")
    const serviceCollection = database.collection("Services")
    const bookingCollection = database.collection("Booking")

    //Auth related api
    app.post('/jwt', async(req,res)=>{
      const user=req.body;
      console.log(user)
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET, {expiresIn:'1h'})
      res
      .cookie('token',token,{
        httpOnly:true,
        secure:false
        // SameSite:'none'
      })
      .send({success: true})
    })

    // app.get('jwt', async(req,res)=>{
    //   const cursor =
    // })

    //get services data
    app.get('/services',logger,  async(req,res)=>{
        const cursor = serviceCollection.find()
        const result = await cursor.toArray()
        res.send(result)
    })

    //get individual services data
    app.get('/services/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id:  new ObjectId(id)}

      // const options ={
      //   projection : {title:1,price:1,service_id:1}
      // }

      const result= await serviceCollection.findOne( query)
      res.send(result)
    })

    //Bookings
    app.post('/bookings', async(req,res)=>{
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking)
      res.send(result)
    })

    app.get('/bookings',verifyToken, async(req,res)=>{
      console.log("dsfdsf",req.query.email, req.user);
      if(req.query.email !== req.user.email){
          return res.status(403).send({message:'Forbidden Access'})
        }
      let query={}
      if(req.query?.email){
        query = {email: req.query.email}
      }
      console.log(query);
      console.log("cookies", req.cookies.token)
      const cursor = bookingCollection.find(query)
      const result = await cursor.toArray()
      res.send(result)
    })

    app.delete('/bookings/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await bookingCollection.deleteOne(query)
      res.send(result)
    })

    app.patch('/bookings/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updatedBooking = req.body;
      const updatedDoc = {
        $set:{
          status: updatedBooking.status
        }
      }

      const result = await bookingCollection.updateOne(filter,updatedDoc)
      res.send(result)
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


app.listen(port, ()=>{
    console.log(`Car Doctor is running on port : ${port}`);
})