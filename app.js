require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy =require("passport-facebook");
const findOrCreate = require('mongoose-findorcreate');



const app=express();


app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));


app.use(session({
secret:"Our little secret", //this will be moved to the environment file later
resave:false,
saveUninitialized:false

}));

app.use(passport.initialize());
app.use(passport.session());



// deploys mongoDB server
mongoose.connect('mongodb://localhost:27017/userDB');

const userSchema = new mongoose.Schema({
    username:String,
    password:String,
    googleId:String,
    facebookId:String,
    secret:String
});

//This hashes and salts our passwords into MongoDB
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = new mongoose.model ("User", userSchema);


// CHANGE: USE "createStrategy" INSTEAD OF "authenticate"
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


//set ups passport for Google AUTH20-tells passport where to look and what to use for authentication

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile)
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

// Facebook authentication

passport.use(new FacebookStrategy({
  clientID: process.env['FACEBOOK_APP_ID'],
  clientSecret: process.env['FACEBOOK_APP_SECRET'],
  callbackURL: "http://localhost:3000/auth/facebook/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile)
  User.findOrCreate({ facebookId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));


// end of facebook auth

app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/facebook",
     
passport.authenticate("facebook")

);


app.get("/auth/facebook/secrets",

passport.authenticate("facebook", { failureRedirect: "/login" }),

function(req, res) {

  // Successful authentication, redirect home.

  res.redirect("/secrets");

});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile", "email"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});

// handles submissions of secrets and sends them to the user DB

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", (req,res)=>{
  const submittedSecret=req.body.secret;
  console.log(req.user.id)
  User.findById(req.user.id, (err,foundUser)=>{
    if(err){
      console.log(err)
    }
    else{
     if (foundUser){
       foundUser.secret=submittedSecret;
       foundUser.save(()=>{
         res.redirect("/secrets");
       });
     }
    }

  });
});


// hashes password with bcrpyt and 10 rounds of Salting
app.post("/register", (req,res)=>{
   
 User.register({username:req.body.username}, req.body.password,function(err,user){
   if(err){
     console.log(err);
     res.redirect("/register")
   } else{
     passport.authenticate("local")(req,res, function(){ // this callback is only triggered if auth is successful in setting up
      // a session cookie that saved their current logged in session. 
      res.redirect('/secrets')
     })
   }
 })

  
  
 
});

// logout route

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});



app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});


app.listen(3000,function(){
    console.log("server running on port 3000")
});




