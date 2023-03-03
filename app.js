//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const ejs = require("ejs");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const mongoose = require("mongoose");

app.use(
    session({
        secret: "Our little secret",
        resave: false,
        saveUninitialized: false,
    })
);

app.use(passport.initialize());
app.use(passport.session());
mongoose.set("strictQuery", false);
mongoose.connect('mongodb+srv://admin-vaibhav:Test123@cluster0.jprmrgj.mongodb.net/userDB')
.then(()=>{console.log("DB Connected");})
.catch((err)=>{console.log(err);});

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: "https://secrets2703.onrender.com/auth/google/secrets",
        },
        function (accessToken, refreshToken, profile, cb) {
            User.findOrCreate({ googleId: profile.id }, function (err, user) {
                return cb(err, user);
            });
        }
    )
);

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", function (req, res) {
    res.render("home");
});

app.get("/secrets", function (req, res) {
    User.find({
        secret: { $ne: null }
    },
        function (err, foundUsers) {
            if (err) {
                console.log(err);
            } else {
                if (foundUsers) {
                    res.render("secrets", { usersWithSecrets: foundUsers });
                } else {
                    res.send("no user found!");
                }
            }
        }
    );
});
app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile"] })
);
app.get(
    "/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect("/secrets");
    }
);

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) console.log(err);
        else res.redirect("/");
    });
});

app.get("/register", function (req, res) {
    res.render("register");
});


app.post("/register", function (req, res) {
    User.register(
        {
            username: req.body.username,
        },
        req.body.password,
        function (err, user) {
            if (err) {
                console.log(err);
                res.redirect("/register");
            } else {
                passport.authenticate("local")(req, res, function () {
                    res.redirect("/secrets");
                });
            }
        }
    );
});

app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password,
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err);
            res.redirect("/login");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });
});

app.get("/submit", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", function (req, res) {
    const submittedSecret = req.body.secret;
    console.log(req.user);

    User.findById(req.user, function (err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            foundUser.secret = submittedSecret;
            foundUser.save(function () {
                res.redirect("/secrets");
            });
        }
    });
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 1000;
}

app.listen(port, function () {
    console.log("Server started on port 1000");
});

