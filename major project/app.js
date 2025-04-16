const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const path = require("path");
const listing = require("./models/listing.js");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");


main().then(() => {
    console.log("connected to db");
}).catch((err)=> {
    console.log(err);
});

async function main () {
    await mongoose.connect(MONGO_URL);
}

app.set("view engine","ejs");
app.set("views",path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine("ejs",ejsMate);
app.use(express.static(path.join(__dirname, "/public")));


app.listen(8080,() => {
    console.log("server is listeningh to port 8080");
});
app.get("/",(req, res)=>{
    res.send("Hi,Iam root");
});

    app.get("/listings",async (req,res)=>{
     const allListings = await Listing.find({});
    res.render("listing/index", {allListings});
    });
    //newroute
    app.get("/listings/new", (req, res)=>{
        res.render("listing/new");
    });
    //show route
    app.get("/listings/:id",async (req, res) => {
        let {id} = req.params;
        const listing = await Listing.findById(id);
        res.render("listing/show",{ listing });
    });
    //create route 
    app.post("/listings",async (req, res)=>{
        const newListing = new Listing(req.body.listing);
        await newListing.save();
        res.redirect("listings");
    });
    //Edit route
    app.get("/listings/:id/edit", async (req, res)=> {
        let {id} = req.params;
        const listing = await Listing.findById(id);
        res.render("listing/edit.ejs",{listing});
    });
    //update route 
    app.put("/Listings/:id",async (req, res) => {
        let {id} = req.params;
        await Listing.findByIdAndUpdate(id,{ ...req.body.listing });
        res.redirect("/listings")      
    });
    app.delete("/listings/:id",async (req, res) => {
        let {id} = req.params;
        let deletedListing = await Listing.findByIdAndDelete(id);
        console.log(deletedListing);
        res.redirect("/listings");        
    });
// app.get("/testlisting",async (req, res)=> {
//     let samplelisting = new Listing({
//         title: "my new villa",
//         description: "by the beach",
//         location: "calangute,Goa",
//         country:"India",
//     });
//     await samplelisting.save();
//     console.log("sample was saved");
//     res.send("successful testing");    
// });