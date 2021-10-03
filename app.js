require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require('mongoose-encryption');


const app=express();


app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));


// deploys mongoDB server
mongoose.connect('mongodb://localhost:27017/userDB');

const userSchema = new mongoose.Schema({
    username:String,
    password:String
});


userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });


const User = new mongoose.model ("User", userSchema);


app.get("/", (req,res)=>{
    res.render("home");
})


app.get("/login", (req,res)=>{
    res.render("login",{errMsg:"", username:"", password:""});
})

app.get("/register", (req,res)=>{
    res.render("register");
})


app.post("/register", (req,res)=>{
   const newUser = new User({
        username: req.body.username,
        password: req.body.password
      });

    newUser.save((err)=>{
        if(err){
            console.log(err)
        }else{
            res.render("secrets")
        }
    })
});


app.post("/login", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
   
    User.findOne({email: username}, (err, foundUser) => {
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          if (foundUser.password === password) {
            res.render("secrets");
          } else {
            res.render("login", {errMsg: "password incorrect", username: username, password: password});
          }
        } else {
          res.render("login", {errMsg: "Email not found", username: username, password: password});
        }
      }
    });
  });



app.listen(3000,function(){
    console.log("server running on port 3000")
});