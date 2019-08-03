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
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

app.get("/", (req, res) => {
    db.Article.find({})
        .then(function (dbArticle) {
            res.render('index', { article: dbArticle });
        })
        .catch(function (err) {
            res.json(err);
        });
});

app.get("/articles/:id", function (req, res) {
    db.Article.find({ _id: req.params.id })
        .populate("notes")
        .then(function (dbArticle) {
            dbArticle = dbArticle[0]
            console.log(dbArticle.notes);
            var noteObject = {
                title: dbArticle.title,
                summary: dbArticle.summary,
                link: dbArticle.link,
                note: dbArticle.notes,
                _id: dbArticle._id
            }
            res.render("comment", noteObject);
        })
        .catch(function (err) {
            res.json(err);
        })
});

app.post("/articles/:id", function (req, res) {
    console.log(req.body)
    db.Note.create(req.body)
        .then(function (dbNote) {
            return db.Article.findOneAndUpdate({ _id: req.params.id }, { $push: { notes: dbNote._id } }, { new: true });
        })
        .then(function (dbArticle) {
            res.redirect("back");
        })
        .catch(function (err) {
            res.json(err);
        });
});

app.get("/scrape", function (req, res) {
    axios.get("https://www.wsj.com/").then(function (response) {

        var $ = cheerio.load(response.data);

        $("article.WSJTheme--story--pKzwqDTt").each(function (i, element) {
            if ($(element).find(".WSJTheme--summary--12br5Svc").text()) {
                var result = {};

                result.title = $(element).find(".WSJTheme--headline--19_2KfxG").text();
                result.link = $(element).find("a").attr("href");
                result.summary = $(element).find(".WSJTheme--summary--12br5Svc").clone().children().remove().end().text();

                db.Article.create(result)
                    .then(function (dbArticle) {
                        console.log(dbArticle);
                    })
                    .catch(function (err) {
                        console.log(err);
                    });
            }
        });
    }).then(function () {
        res.redirect("back");
    })
});

app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});

