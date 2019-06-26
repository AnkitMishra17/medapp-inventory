const express = require("express")
const mongoose = require("mongoose")
const moment = require("moment")
const sharp = require("sharp")
const multer = require("multer")
const Supervisor = require("../models/supervisorModel")
const Location = require("../models/locationModel.js")
const Product = require("../models/productModel.js")
const Order = require("../models/orderModel.js")
const Vendor = require("../models/vendorModel.js")
const Inventory = require("../models/inventoryModel")
const { isSupervisorLoggedIn, isSupervisorLoggedOut } = require("../middleware/auth.js")
const { check, validationResult } = require("express-validator/check");

const router = express.Router()

const uploadInvoice = multer({
	fileFilter (req, file, cb) {
		if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){
			return cb(undefined, false)
		}

		cb(undefined, true)
	}
})

const title = {
	supervisorLogin: "Login | Supervisor",
	supervisorRegister: "Register | Supervisor",
	supervisorDashboard: "Dashboard | Supervisor",
	supervisorNewOrder: "New Order | Supervisor",
	supervisorOrders: "Orders | Supervisor",
	supervisorOrderHistory: "History | Supervisor",
	supervisorInventory: "Inventory | Supervisor",
	supervisorUpdateInventory: "Update Inventory | Supervisor"
}

router.get("/login", isSupervisorLoggedOut, (req, res) => {
	res.render("./supervisor/login", {
		pageTitle: title.supervisorLogin,
		email: ""
	})
})

router.get("/register", isSupervisorLoggedOut, async (req, res) => {
	try {
		const locations = await Location.find({}).sort({state: -1}).sort({city : -1})

		res.render("./supervisor/register", {
			pageTitle: title.supervisorRegister,
			name: "",
			email: "",
			locId: "",
			locations
		})
	} catch(e) {
		res.status(500).send("Something went wrong!\n" + e)
	}
})


router.get("/dashboard", isSupervisorLoggedIn, async (req, res) => {
	try {
		res.render("./supervisor/dashboard", {
			pageTitle: title.supervisorDashboard
		})
	} catch(e) {
		res.status(400).send(`<h3>Something went wrong!</h3><p>${e}</p>`)
	}
})


router.get("/orders/new", isSupervisorLoggedIn, async (req, res) => {
	try {
		const products = await Product.find({}).sort({ name: 1})
		const vendors = await Vendor.find({}).sort({ name: 1})

		for (const vendor of vendors) {
			await vendor.populate({
			 	path: "location"
		 	}).execPopulate()
		}

		res.render("./supervisor/newOrder", {
			pageTitle: title.supervisorNewOrder,
			product: "",
			quantity: "",
			vendor: "",
			products,
			vendors
		})

	} catch(e) {
		res.status(400).send(`<h3>Something went wrong!</h3><p>${e}</p>`)
	}
})

router.get("/orders/history", isSupervisorLoggedIn, async (req, res) => {
	try {
		if(req.query.id) {
			const order = await Order.findById(req.query.id)

			if(!order) {
				req.flash("danger", "No such order found!")
				return res.redirect("/supervisor/orders")
			}

			await order.populate("product", "name").populate("vendor").execPopulate()

			if(order.vendor) {
				await order.vendor.populate("location").execPopulate()
			}

			res.render("./supervisor/orderHistory", {
				pageTitle: title.supervisorOrderHistory,
				order
			})
		} else {
			req.flash("danger", "Invalid Operation!")
			return res.redirect("/supervisor/orders")
		}
	} catch(e) {
		res.status(400).send(`<h3>Something went wrong!</h3><p>${e}</p>`)
	}
})
router.get("/orders", isSupervisorLoggedIn, async (req, res) => {
	try {
		let monthArray = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
		let yearArray = []

		for(let y = moment().year(); y >= 2000; y--)
			yearArray.push(String(y))

		if(["month", "year"].includes(req.query.option)) {

			let viewBy = req.query.option
			let month = Number(req.query.month)
			let year = req.query.year
			let expression = {}

			if(viewBy === "month" && ( month >= 1 && month <= 12) && yearArray.includes(year)) {
				expression = {
					$and: [
						{$eq: [{$year: "$createdAt"}, Number(year)]},
						{$eq: [{$month: "$createdAt"}, month]}
					]
				}
			} else if(viewBy === "year" && yearArray.includes(year)) {
				expression = {
					$eq: [{$year: "$createdAt"}, Number(year)]
				}
			} else {
				req.flash("danger", "Invalid Operation!")
				return res.redirect("/supervisor/dashboard")
			}

			const orders = await Order.find({ 
				supervisor: req.session.supervisor._id,
				$expr: expression
			}).sort({ createdAt: -1})
			

			for (const order of orders) {
				await order.populate("product", "name").populate("vendor", "name").execPopulate()
			}

			res.render("./supervisor/orders", {
				pageTitle: title.supervisorOrders,
				viewBy,
				month,
				monthName: monthArray[month - 1],
				year,
				monthArray,
				yearArray,
				orders
			})			
		} else {
			let month = moment().month() + 1
			let year = moment().year()
			let viewBy = "month"
			let orders = await Order.find({
				supervisor: req.session.supervisor._id,
				$expr: {
					$and: [
						{$eq: [{$year: "$createdAt"}, year]},
						{$eq: [{$month: "$createdAt"}, month]}
					]
				}
			}).sort({ createdAt: -1})

			for (const order of orders) {
				await order.populate("product", "name").populate("vendor", "name").execPopulate()
			}

			res.render("./supervisor/orders", {
				pageTitle: title.supervisorOrders,
				viewBy,
				month,
				monthName: monthArray[month - 1],
				year,
				monthArray,
				yearArray,
				orders
			})
		}
	} catch(e) {
		res.status(500).send(`<h3>Something went wrong</h3><p>${e}</p>`)
	}
})

router.post("/login", isSupervisorLoggedOut, [
		check("email").not().isEmpty().withMessage("Please provide email.").isEmail().withMessage("Invalid email address.").trim().escape(),
		check("password").not().isEmpty().withMessage("Please provide password.").trim().escape()
	], async (req, res) => {
		try {
			let email = req.body.email
			let password = req.body.password

			const errors = validationResult(req)

			if(!errors.isEmpty()){
				return res.render("./supervisor/login", {
					pageTitle: title.supervisorLogin,
					errors: errors.array(),
					email
				})
			}
			const supervisor = await Supervisor.authenticate(email, password)
			
			if(!supervisor){
				req.flash("danger", "Incorrect email or password!")
				return res.render("./supervisor/login", {
					pageTitle: title.supervisorLogin,
					email
				})
			}

			req.session.supervisor = supervisor

			res.redirect("/supervisor/dashboard")
		} catch(e) {
			res.status(400).send("Unable to login!\n" + e)
		}
})

router.post("/register", isSupervisorLoggedOut, [
		check("name").not().isEmpty().withMessage("Please provide employee name.").trim().escape(),
		check("email").not().isEmpty().withMessage("Please provide email.").isEmail().withMessage("Provide email address.").trim().escape(),
		check("locId").not().isEmpty().withMessage("Provide select your location.").trim().escape(),
		check("password").not().isEmpty().withMessage("Please provide password.").trim().escape(),
		check("confPassword").not().isEmpty().withMessage("Please confirm your password.").custom((value, {req}) => value === req.body.password).withMessage("Password does not match.").trim().escape()
	], async (req, res) => {
		try{
			let name = req.body.name
			let email = req.body.email
			let password = req.body.password
			let locId = req.body.locId

			const errors = validationResult(req)

			if(!errors.isEmpty()) {
				const locations = await Location.find({}).sort({state: -1}).sort({city: -1})

				res.render("./supervisor/register", {
					pageTitle: title.supervisorRegister,
					name,
					email,
					locId,
					locations,
					errors: errors.array()
				})
			}

			const location = await Location.findById(req.body.locId)

			if(!location) {
				const locations = await Location.find({}).sort({state: -1}).sort({city: -1})

				req.flash("danger", "Invalid Location!")
				return res.render("./supervisor/register", {
					pageTitle: title.supervisorRegister,
					name,
					email,
					locId: "",
					locations
				}) 
			}

			const supervisor = await Supervisor.findOne({ email })

			if(supervisor){
				const locations = await Location.find({}).sort({state: -1}).sort({city: -1})

				req.flash("danger", "Email address exists, use another.")
				return res.render("./supervisor/register", {
					pageTitle: title.supervisorRegister,
					name,
					email: "",
					locId,
					locations
				})
			}

			const newSupervisor = await new Supervisor({
				name,
				email,
				password,
				location: locId
			})

			await newSupervisor.save()

			delete newSupervisor.password

			req.session.supervisor = newSupervisor

			res.redirect("/supervisor/dashboard")
		} catch(e) {
			res.status(400).send("Unable to register!\n" + e)
		}
})

router.get("/logout", isSupervisorLoggedIn, (req, res) => {
	req.session.supervisor = null
	res.redirect("/supervisor/login")
})

router.post("/orders/new", isSupervisorLoggedIn, [
		check("product").not().isEmpty().withMessage("Please choose a product!").trim().escape(),
		check("quantity").not().isEmpty().withMessage("Please provide quantity!").custom((value) => Number(value) && value > 0).withMessage("Quantity can only be in numbers greater than 0!").trim().escape()
	], async (req, res) => {
	try{
		const product = req.body.product
		const quantity = req.body.quantity

		const errors = validationResult(req)

		if(!errors.isEmpty()) {			
			const products = await Product.find({}).sort({ name: 1})

			return res.render("./supervisor/newOrder", {
				pageTitle: title.supervisorNewOrder,
				product,
				products,
				quantity,
				errors: errors.array()
			})
		}

		const prod = await Product.findById(product)

		if(!prod) {
			req.flash("danger", "No such product exists!")
			return res.redirect("/supervisor/orders/new")
		}

		const today = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}))

		const newOrder = new Order({
			product,
			quantity,
			supervisor: req.session.supervisor._id,
			track: {
				ordered: {
					status: true,
					date: today
				}
			}
		})

		await newOrder.save()

		req.flash("success", "Order request sent successfully!")
		res.redirect("/supervisor/orders")
	} catch(e) {
		res.status(400).send("Unable to register!\n" + e)
	}
})

router.post("/orders/uploadInv", isSupervisorLoggedIn, uploadInvoice.single("invImage"), async (req, res) => {
	try{
		if(req.query.id) {
			const order = await Order.findById(req.query.id)
			let buffer = ""

			if(!order) {
				req.flash("warning", "Invalid Operation!")
				return res.redirect("/supervisor/orders")
			}

			if(!req.file) {
				req.flash("danger", "Please upload a invoice image!")
				return res.redirect("/supervisor/orders")
			}

			buffer = await sharp(req.file.buffer).resize({ width: 1024, height: 1024}).png().toBuffer()
			
			for (const stage of Object.entries(order.track)) {

				if(stage[0] == "$init")  {
					continue 
				}

				const today = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}))

				if(!stage[1].status) {
					if(stage[0] == "invoiceUploaded") {

						order.invoiceImage = buffer

						order.track.invoiceUploaded = {
							status: true,
							date: today,
							superMsg: "Invoice Uploaded"
						}

						await order.save()

						req.flash("success", "Order invoice uploaded successfully!")
						return res.redirect("/supervisor/orders")
					} else {
						req.flash("danger", "Invalid Operation!")
						return res.redirect("/supervisor/orders")
					}
				}
			}
		} else {
			req.flash("danger", "Invalid Operation!")
			return res.redirect("/supervisor/orders")
		}
	} catch(e) {
		res.status(500).send(`<h3>Something went wrong</h3><p>${e}</p>`)
	}
})

router.get("/inventory", isSupervisorLoggedIn, async (req, res) => {
	try {
		const items = await Inventory.find({ supervisor: req.session.supervisor._id })

		for (const item of items) {
			await item.populate("product").execPopulate()
		}
		
		res.render("./supervisor/inventory", {
			pageTitle: title.supervisorInventory,
			items
		})
	} catch(e) {
		res.status(500).send(`<h3>Something went wrong</h3><p>${e}</p>`)	
	}
})

router.get("/inventory/update", isSupervisorLoggedIn, async (req, res) => {
	try {
		if(!req.query.id) {
			req.flash("danger", "Invalid Operation!")
			return res.redirect("/supervisor/inventory")
		}

		const item = await Inventory.findOne({ _id: req.query.id, supervisor: req.session.supervisor._id })

		await item.populate("product").execPopulate()
	
		res.render("./supervisor/updateInventory", {
			pageTitle: title.supervisorUpdateInventory,
			item
		})
	} catch(e) {
		res.status(500).send(`<h3>Something went wrong</h3><p>${e}</p>`)	
	}
})

router.post("/inventory/update", isSupervisorLoggedIn, [
		check("quantity").not().isEmpty().withMessage("Please provide quanity used.").isNumeric().withMessage("Quantity can only be in numbers.").trim().escape(),
		check("detail").not().isEmpty().withMessage("Please provide details.").trim().escape()
	], async (req, res) => {
	try {
		if(!req.query.id) {
			req.flash("danger", "Invalid Operation!")
			return res.redirect("/supervisor/inventory")
		}

		const errors = validationResult(req)

		if(!errors.isEmpty()) {			
			req.flash("danger", errors.array()[0])
			return res.redirect(req.headers.host + req.url)
		}

		const item = await Inventory.findOne({ _id: req.query.id, supervisor: req.session.supervisor._id })

		if(!item) {
			req.flash("danger", "No such inventory found!")
			return res.redirect("/supervisor/inventory")
		}
		const quantity = req.body.quantity
		const detail = req.body.detail

		if(quantity > item.leftQuantity) {
			req.flash("danger", "Quantity used cannot be greater than available.")
			return res.redirect(req.headers.host + req.url)
		}

		const today = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}))

		item.leftQuantity -= quantity

		item.history.push({
			quantity,
			detail,
			date: today,
			isUsed: true 
		})

		await item.save()

		req.flash("success", "Inventory updated!")
		res.redirect("/supervisor/inventory")

	} catch(e) {
		res.status(500).send(`<h3>Something went wrong</h3><p>${e}</p>`)	
	}
})

router.get("/inventory/history", isSupervisorLoggedIn, async (req, res) => {
	try {
		if(!req.query.id) {
			req.flash("danger", "Invalid Operation!")
			return res.redirect("/supervisor/inventory")
		}

		const item = await Inventory.findOne({ _id: req.query.id, supervisor: req.session.supervisor._id })

		await item.populate("product").execPopulate()
	
		res.render("./supervisor/inventoryHistory", {
			pageTitle: title.supervisorInventoryHistory,
			item
		})
	} catch(e) {
		res.status(500).send(`<h3>Something went wrong</h3><p>${e}</p>`)	
	}
})

module.exports = router