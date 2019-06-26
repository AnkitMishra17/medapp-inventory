const ejs = require("ejs")
const path = require("path")
const express = require("express")
const helmet = require("helmet")
const db = require("./db/mongoose.js")
const session = require("express-session")
const MongoStore = require("connect-mongo")(session)
const messages = require("express-messages")
const flash = require("connect-flash")
const { isAuthorized } = require("./middleware/auth.js")
const Order = require("./models/orderModel")

const adminRoute = require("./routes/adminRoute.js")
const vendorRoute = require("./routes/vendorRoute.js")
const supervisorRoute = require("./routes/supervisorRoute.js")

const app = express()

//set the development environment port
const port = process.env.PORT || 3000

const viewsPath = path.join(__dirname, "/views")

app.enable('trust proxy');


// app.use((req, res, next) => {
//   if(!req.secure) {
//     res.redirect(`https://${req.headers.host}${req.url}`)
//   }
//   next()
// })



app.use(express.static(path.join(__dirname, "../public")))

app.use(helmet())

app.use(express.urlencoded({ extended: true}))

//setup express-session middleware
app.use(session({
  secret: 'Xy12MIbneRt Un2w',
  resave: true,
  saveUninitialized: true,
  cookie: {
  	httpOnly: true,
  	expires: new Date(Date.now() + 60 * 60 * 1000)
  },
  store: new MongoStore({
    mongooseConnection: db
  })
}));

//set the view engine to ejs
app.set("view engine", "ejs")
app.set("views", viewsPath)

//setup express-messages middleware
app.use(flash());
app.use(function (req, res, next) {
  res.locals.messages = messages(req, res)
  next();
});

//setup global errors variable
app.locals.errors = null;

app.use("/vendor", vendorRoute)
app.use("/supervisor", supervisorRoute)
app.use("/medapp-inventory-admin", adminRoute)

app.get("/", (req, res) => {
  res.render("index.ejs", {
    pageTitle: "Home | Inventory App"
  })
})

app.get("/order/invoice", isAuthorized, async (req, res) => {
  try {
    if(req.query.id) {
      const order = await Order.findById(req.query.id)
      res.set("Content-Type", "image/png")
      res.send(order.invoiceImage)
    } else {
      res.status(400).send("Something went wrong!")
    }
  } catch(e) {
    res.status(500).send("Something went wrong! \n" + e)
  }
})

//add the manifest
app.get("/manifest.json", function(req, res){
  //send the correct headers
  res.header("Content-Type", "text/cache-manifest");
  //console.log(path.join(__dirname,"manifest.json"));
  //send the manifest file
  //to be parsed bt express
  res.sendFile(path.join(__dirname,"../manifest.json"));
});

//add the service worker
app.get("/sw.js", function(req, res){
  //send the correct headers
  res.header("Content-Type", "text/javascript");
  
  res.sendFile(path.join(__dirname,"../sw.js"));
});

app.get("/loader.js", function(req, res){
  //send the correct headers
  res.header("Content-Type", "text/javascript");
  
  res.sendFile(path.join(__dirname,"../loader.js"));
});

app.listen(port, (req, res) => {
  console.log(`Server started at port ${port}..`)
})
