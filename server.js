var express = require("express");
var mongoose = require("mongoose");

var axios = require("axios");
var cheerio = require("cheerio");

var db = require("./models");

var PORT = process.env.PORT || 3000;

var app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

var exphbs = require('express-handlebars');

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");


var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
mongoose.connect(MONGODB_URI);

app.get("/articles", function (req, res) {
    db.Article.find({})
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        });
});



app.get("/articles/:id", function (req, res) {
    db.Article.find({ _id: req.params.id })
        .populate("notes")
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        })
});



app.post("/articles/:id", function (req, res) {
    // TODO
    db.Note.create(req.body)
        .then(function (dbNote) {
            return db.Article.findOneAndUpdate({ _id: req.params.id }, { $set: { note: dbNote._id } }, { new: true });
        })
        .then(function (dbArticle) {
            res.json(dbArticle)
        })
        .catch(function (err) {
            // If an error occurs, send it back to the client
            res.json(err);
        });
});

app.get("/scrape", function (req, res) {
    axios.get("https://www.wsj.com/").then(function (response) {

        var $ = cheerio.load(response.data);

        $("article.WSJTheme--story--pKzwqDTt").each(function (i, element) {

            var result = {};

            result.title = $(element).find("a").text();
            result.link = $(element).find("a").attr("href");
            result.summary = $(element).find("p").text();

            db.Article.create(result)
            .then(function (dbArticle) {
              console.log(dbArticle);
            })
            .catch(function (err) {
              console.log(err);
            });
        });
    })
});
// Listen on port 3000
app.listen(3000, function () {
    console.log("App running on port 3000!");
});

app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});