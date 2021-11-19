require('dotenv').config();

const express = require("express");
const app = express();

const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

//Static folder
app.use(express.static("public"));

//EJS-ViewEngine
app.set("view engine", "ejs");

//Body-parser
app.use(express.urlencoded({ extended: true }));

////////////////////////////////////////////////////////////////// SESSION

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

////////////////////////////////////////////////////////////////// DATABASE

const localDatabase = "mongodb://localhost:27017/ToDoListLocalDB";
const cloudDatabase = "mongodb+srv://" + process.env.ATLAS_USERNAME + ":" + process.env.ATLAS_PASSWORD + "@cluster0.pskyp.mongodb.net/ToDoListCloudDB?retryWrites=true&w=majority"

let database = "";

if (process.env.ENVIRONMENT === "Development") {
    database = localDatabase;
} else if (process.env.ENVIRONMENT === "Production") {
    database = cloudDatabase;
}

mongoose.connect(database, { useNewUrlParser: true, useUnifiedTopology: true }, function (error) {
    if (error) {
        console.log(error);
    } else {
        console.log("Connected to Database");
    }
});

// SCHEMA
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    listItems: [String]
});

// SCHEMA - ENCRYPTION
userSchema.plugin(passportLocalMongoose);

// MODEL
const User = new mongoose.model("User", userSchema);

////////////////////////////////////////////////////////////////// PASSPORT

// STRATEGY - LOCAL
passport.use(User.createStrategy());

// COOKIES
passport.serializeUser(User.serializeUser()); // WRITE-COOKIE
passport.deserializeUser(User.deserializeUser()); // READ-COOKIE 

////////////////////////////////////////////////////////////////// ROUTES

// GET

app.get("/", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("list");
    } else {
        res.render("home");
    }
});

app.get("/register", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("list");
    } else {
        res.render("register");
    }
});

app.get("/login", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("list");
    } else {
        res.render("login");
    }
});

app.get("/todolist", function (req, res) {
    if (req.isAuthenticated()) {
        const userID = req.user._id;
        console.log("USER ID: " + userID);
        User.find({ _id: userID }, function (err, docs) {
            if (err) {
                console.log(err);
            } else {
                res.render("list", { displayItems: docs[0].listItems });
            }
        });
    } else {
        res.redirect("/login");
    }
});

app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});

// POST

app.post("/register", function (req, res) {
    User.register({ username: req.body.username }, req.body.password, function (err, createdUser) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/todolist");
            });
        }
    });
});

app.post("/login", passport.authenticate("local", {
    //Login Fails
    failureRedirect: "/login"
}), function (req, res) {
    //Login Success
    res.redirect("/todolist");
});

app.post("/todolist", function (req, res) {

    if (req.isAuthenticated()) {
        const userID = req.user._id;
        console.log("USER ID FOR ADD: " + userID);
        const newPost = req.body.newItem;

        User.findOne({ _id: userID }, function (err, foundUser) {
            foundUser.listItems.push(newPost);

            foundUser.save(function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(userID + " : list has been updated");
                    res.redirect("/todolist");
                }
            });

        });
    } else {
        res.redirect("/login");
    }

});

app.post("/delete", function (req, res) {

    if (req.isAuthenticated()) {
        const userID = req.user._id;
        console.log("USER ID FOR DELETE: " + userID);
        const selectedItemName = req.body.deleteThis;

        User.findOneAndUpdate({ _id: userID }, { $pull: { listItems: selectedItemName } }, function (err, foundList) {
            if (err) {
                console.log(err);
            } else {
                console.log("Record : " + selectedItemName + " associated with " + userID + " ID is removed.");
                res.redirect("/todolist");
            }
        });
    } else {
        res.redirect("/login");
    }

});

////////////////////////////////////////////////////////////////// PORT

let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}

app.listen(port, function () {
    console.log("Server has started successfully.");
});