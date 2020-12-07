const express = require("express");
const mongoose = require("mongoose");

const axios = require("axios");
const cheerio = require("cheerio");

const db = require("./models");

const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

const exphbs = require('express-handlebars');

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");


const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

app.get("/", (req, res) => {
    db.Article.find({})
        .then((dbArticle) => {
            res.render('index', { article: dbArticle });
        })
        .catch((err) => {
            res.json(err);
        });
});

app.get("/articles/:id", (req, res) => {
    db.Article.find({ _id: req.params.id })
        .populate("notes")
        .then((dbArticle) => {
            dbArticle = dbArticle[0]
            const noteObject = {
                title: dbArticle.title,
                summary: dbArticle.summary,
                link: dbArticle.link,
                note: dbArticle.notes,
                _id: dbArticle._id
            }
            res.render("comment", noteObject);
        })
        .catch((err) => {
            res.json(err);
        })
});

app.post("/articles/:id", (req, res) => {
    db.Note.create(req.body)
        .then((dbNote) => {
            return db.Article.findOneAndUpdate({ _id: req.params.id }, { $push: { notes: dbNote._id } }, { new: true });
        })
        .then((dbArticle) => {
            res.redirect("back");
        })
        .catch((err) => {
            res.json(err);
        });
});

app.get("/scrape", (req, res) => {
    axios.get("https://www.wsj.com/").then((response) => {

        const $ = cheerio.load(response.data);
        $("article.WSJTheme--story--XB4V2mLz").each((i, element) => {
            if ($(element).find(".WSJTheme--summary--lmOXEsbN ").text()) {
                const result = {};
                result.title = $(element).find(".WSJTheme--headline--unZqjb45").text();
                result.link = $(element).find("a").attr("href");
                result.summary = $(element).find(".WSJTheme--summary--lmOXEsbN ").clone().children().remove().end().text();

                db.Article.create(result)
                    .then((dbArticle) => {
                        console.log(dbArticle);
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            }
        });
    }).then(() => {
        res.redirect("back");
    })
});

app.listen(PORT, () => {
    console.log("App running on port " + PORT + "!");
});

