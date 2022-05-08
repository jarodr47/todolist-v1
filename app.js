const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const _ = require("lodash");
const dateGenerator = require(__dirname + "/date.js");
const app = express();

app.use(bodyParser.urlencoded({extended: true}));
//we set our view engine to ejs so that we can use ejs files instead of html
app.set("view engine", "ejs");
//this is used so we can serve static files such as our css
app.use(express.static("public"));

//here we are connecting to our mongoose db
mongoose.connect(`mongodb+srv://admin-jarodr:${process.env.DBPW}@cluster0.0fula.mongodb.net/todolistDb?retryWrites=true&w=majority`, {useNewUrlParser: true});

//this is the schema we will be using to store todo items
const itemsSchema = new mongoose.Schema ({
    name: String
});

//create a data model that will use the defind schema above
const Item = mongoose.model("Item", itemsSchema);

//create some initial items
const item1 = new Item ({
    name: "Welcome to your todolist!"
})

const item2 = new Item ({
    name: "Hit the '+' button to add a new item."
})

const item3 = new Item ({
    name: "<-- check this box to delete completed items."
})

const defaultItems = [item1, item2, item3];

const listSchema = new mongoose.Schema ({
    name: String,
    items: [itemsSchema]
});

const List = mongoose.model("List", listSchema);

let day = "";

app.get("/", function(req,res) {
    day = "Today";

    /**
     * here we are pulling all itms from our Items database, if there aer none we insert new ones
     * else if there are some then we just serve those up
     */
    Item.find({}, function(err, results){
            if (results.length === 0) {
                Item.insertMany(defaultItems, function(err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("Success!")
                    }
                });
                res.redirect("/");
            } else {
                res.render("lists", {kindOfDay: day, newListItems: results})
            };
        }
   )    
})


/**
 * These are custom routes, what we are using this for is to serve our HTML specific to the path 
 * a user types in their browser
 */
app.get("/:customListName", function(req, res) {
    //lodash is used to normalize the todolist name
    const customListName = _.capitalize(req.params.customListName);
    //we find if a record exists with the name given by the user
    List.findOne({name:customListName}, function(err, results){
        if(results) {
            //if it exists we serve it to them with its info from the db
            res.render("lists", {kindOfDay: results.name, newListItems: results.items})
        } else {
            //else we create a new list with default items
            const list = new List({
                name: customListName,
                items: defaultItems
            })
            //save the new list and redirect user to same page
            list.save();
            res.redirect(`/${customListName}`);
        }
    })
})

app.post("/", function(req,res) {

    //here we are getting the list name and the new item that was created for it
    //we get these from the values submitted in the forms on the ejs files
    const listName = req.body.list;
    const itemName = req.body.newItem;

    //we then create a new Item document for our db
    const item = new Item({
        name: itemName
    });

    // newItems.push(req.body.newItem);

    //if we are in the default list we save and add to it
    if (listName === "Today") {
        item.save();
        res.redirect("/");
    } else {
        //otherwise we look for the list it was submitted under, add it to the db
        //and serve it up to the user
        List.findOne({name:listName}, function(err, result){
            result.items.push(item);
            result.save();
            res.redirect(`/${listName}`);
        })
    }

    
})

/**
 * the delete route will be used to delete items from the db onche the checkbox is checked
 */
app.post("/delete", function(req,res) {
    //first we gather the list name from the current path the user is on
    const listName = req.body.listName;

    //if we are on the default list the we look up the item by its id and delete it
    if (listName === "Today") {
        Item.deleteOne({_id: req.body.deletedItem}, function(err) {
            if (err) {
                console.log(err);
            } else {
                console.log("Deleted!")
            }
        });
        res.redirect("/");
    } else {
        //if we are in another list we need to look up that list by its name, and then find the specific item by its id
        List.findOneAndUpdate({name: listName}, {$pull: {items: {_id:req.body.deletedItem}}}, function(err, results){
            if (err) {
                console.log(err);
            } else {
                res.redirect(`/${listName}`);
            }
        })
    }
    
})

app.listen(process.env.PORT, function () {
    console.log("server started");
})