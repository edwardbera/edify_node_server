const express = require('express');
var bodyparser = require("body-parser");

const app = express();

app.use(bodyparser.urlencoded({extended:true}));



app.post('/test', (req, res)=>{
    console.log(req.body)
})



app.listen(9000, ()=> console.log('Running Server'));

