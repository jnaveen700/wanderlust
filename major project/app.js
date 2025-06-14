const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const path = require("path");
const listing = require("./models/listing.js");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const {listingSchema} = require("./schema.js");


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


app.get("/",(req, res)=>{
    res.send("Hi,Iam root");
});

    app.get("/listings",async (req,res)=>{
     const allListings = await Listing.find({});
    res.render("listing/index", {allListings});
    });

    const validatelisting = (req,res,next) => { 
        let error = listingSchema.validate(req.body);
        if(error){
            let errmsg = error.deatils.map((el)=> el.message).join(",");
            throw new ExpressError(400,errmsg);
        }else{
            next();
        }

    };
    //newroute
    app.get("/listings/new", (req, res)=>{
        res.render("listing/new");
    });
    //show route
    app.get("/listings/:id",wrapAsync( async (req, res) => {
        let {id} = req.params;
        const listing = await Listing.findById(id);
        res.render("listing/show",{ listing });
    }));
    //create route 
    app.post("/listings",wrapAsync( async (req, res)=>{
            const newListing = new Listing(req.body.listing);
            await newListing.save();
            res.redirect("/listings");
    }));
    //Edit route
    app.get("/listings/:id/edit", wrapAsync( async (req, res)=> {
        if(!req.body.listings){
            throw new ExpressError(400,"Send valid data for listing");
        }
        let {id} = req.params;
        const listing = await Listing.findById(id);
        res.render("listing/edit.ejs",{listing});
    }));
    //update route 
    app.put("/Listings/:id",wrapAsync( async (req, res) => {
        let {id} = req.params;
        await Listing.findByIdAndUpdate(id,{ ...req.body.listing });
        res.redirect("/listings")      
    }));
    app.delete("/listings/:id",wrapAsync( async (req, res) => {
        let {id} = req.params;
        let deletedListing = await Listing.findByIdAndDelete(id);
        console.log(deletedListing);
        res.redirect("/listings");        
    }));

    app.all("*",(req,res,next)=>{
        next(new ExpressError(404,"Page Not Found!!!"));
    });

    app.use((err,req,res,next) =>{
        let {statusCode=500,message="There was an error on our side"}= err;
        //res.status(statusCode).send(message);
        res.status(statusCode).render("error.ejs", {message} );
    });


    app.listen(8080,() => {
        console.log("server is listeningh to port 8080");
    });
