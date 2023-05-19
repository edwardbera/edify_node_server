//require('dotenv').config({path:'../../env/config.env'})
const uri = process.env.MONGODB
const PORT = process.env.PORT
const express = require('express');
var mongo = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
const app = express();
const router = express.Router();
const cors = require("cors");
const bcrypt = require("bcrypt")
const path =  require('path');
const fs = require('fs');
var bodyparser = require("body-parser");
var AWS = require("aws-sdk");
app.use(bodyparser.json())
app.use(bodyparser.urlencoded({extended:true}));
app.use(router);
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const multer  = require('multer')
const upload = multer({ dest: 'upload/' })

AWS.config.update({
    accessKeyId: process.env.AWSACCESSKEYID,
    secretAccessKey: process.env.AWSSECRETACCESSKEY
  });

  const s3Client = new S3Client({
    region : "us-east-1",
    credentials: {
        accessKeyId: process.env.AWSACCESSKEYID,
        secretAccessKey: process.env.AWSSECRETACCESSKEY
    }
  })

var s3 = new AWS.S3();

app.use(cors({
    origin : "*",
    credentials : false
}));

//Fnction to create a signed URL
 function getUrl(key){
    const getObjectParams = {
        Bucket : 'edifylibrary',
        Key : key
       }
        const command = new GetObjectCommand(getObjectParams);
        const url =  getSignedUrl(s3Client, command, { expiresIn: 600000 });
        
    return url;

}

app.post("/upload", upload.array("files", 5) , async (req, res)=>{
    var aurl;
    var now = false;
    const files = req.files;
    const info = req.body
    
    //Parameters for AWS Artwork Bucket
    var params = {
        Bucket : 'edifylibrary',
        Body : fs.createReadStream(files[0].path),
        Key : "artwork/"+Date.now()
    };
    //Parameters for AWS Audio Bucket
    var params2 = {
        Bucket : 'edifylibrary',
        Body : fs.createReadStream(files[1].path),
        Key : "audio/"+Date.now()
    };
    
    //Uploading Artwork
    s3.upload(params, function (err, data){
        const client = new MongoClient(uri);
            if (err) {
                console.log("Error", err);
                res.send(err)
              }
            
              if (data) {
                console.log("Uploaded in:", data);
                
              }
              //Function to insert metadata to MongoDB
              async function insert(url){
                try {
    
                    const data = {
                        title : info.files[0],
                        artist : info.files[2],
                        album : info.files[1],
                        artwork : url,
                
                    }
                    const database = client.db("edify_db");
                    const app_db = database.collection("library");
            
                    
            
                    const result = await app_db.insertOne(data);
                    
                    console.log(`A document has ben inserted with the id : ${result.insertedId}`);
                    
                } finally{
            
                    await client.close();
                    
                    
                }
        
              }
              
              async function loc () {

                aurl = await getUrl(data.Key);
                insert(aurl);
              return aurl;
              } 
             
              loc();
    
        });
       
   
    //Uploading Audio
   s3.upload(params2, function (err, data){
    const client = new MongoClient(uri);
    if (err) {
        console.log("Error", err);
        
      }
    
      if (data) {
        console.log("Uploaded in:", data);
        
      }

      async function insert(url){
        try {

            const data = {
                title : info.files[0],
        
            }
            const database = client.db("edify_db");
            const app_db = database.collection("library");
    
            
    
            const result = await app_db.updateOne(data, {
                $set : {
                    audio : url
                }
            } );
            
            console.log(`A document has been updated with the id : ${result.insertedId}`);
            
            
        } finally{
    
            await client.close();
            res.send("Complete")
        }

      }

      async function loc () {
        aurl = await getUrl(data.Key);
        insert(aurl);
      return aurl;
      } 
     
      

      loc();


});



   


});


app.post("/login" , async (req, res)=>{
    const client = new MongoClient(uri);
    const user = req.body.username;
    const pw = req.body.password;
    
    try {
        const database = client.db("edify_db");
        const app_db = database.collection("users");

        const data = {
            username : user,
        }

        const result = await app_db.findOne(data);
        
        bcrypt.compare(pw, result.password, function(err, rez ){
            if (rez == true){
                //console.log("matched")
                return res.send("Successfull");
            }else{
                return res.send("Failed");
            }
                
        })
     
    } finally{

        await client.close();
        
   }
    
});

app.post("/createUser" , async (req, res)=>{
    const client = new MongoClient(uri);
    const user = req.body.username;
    const pw = req.body.password;
    const data = {
        username : user,
        password : pw,
    }

    try {
        const database = client.db("edify_db");
        const app_db = database.collection("users");
        const result = await app_db.insertOne(data);
        console.log(`A document has ben inserted with the id : ${result.insertedId}`);
        return res.send("Successfull");
    } finally{

        await client.close();
        
    }
    
});

app.get("/getAlbums", async (req, res) =>{
    const client = new MongoClient(uri);
    try{
        const database = client.db("edify_db");
        const library_db = database.collection('library');
        const result =  await library_db.find({}).toArray();
        res.send(result);
        
    }finally{
        await client.close();
    }

});

app.get("/test", async (req, res) =>{
    
    req.send(uri)
});

app.listen(PORT, ()=> console.log(`Running Server on ${PORT}`));
