const express = require("express")
const mongoose = require("mongoose")
const moment = require("moment")
const Vendor = require("../models/vendorModel")
const Location = require("../models/locationModel")
const Order = require("../models/orderModel")
const Product = require("../models/productModel")
const { isVendorLoggedIn, isVendorLoggedOut } = require("../middleware/auth.js")
const { check, validationResult } = require("express-validator/check");

const router = express.Router()

const title = {
	vendorLogin: "Login | Vendor",
	vendorRegister: "Register | Vendor",
	vendorDashboard: "Dashboard | Vendor",
	vendorOrders: "Orders | Vendor"
}

router.get("/login", isVendorLoggedOut, (req, res) => {
	res.render("./vendor/login", {
		pageTitle: title.vendorLogin,
		email: ""
	})
})

router.get("/register", isVendorLoggedOut, async (req, res) => {
	try {
		const locations = await Location.find({}).sort({state: -1}).sort({city : -1})

		res.render("./vendor/register", {
			pageTitle: title.vendorRegister,
			name: "",
			email: "",
			locId: "",
			locations
		})
	} catch(e) {
		res.status(500).send("Something went wrong!\n" + e)
	}
})

router.post("/login", isVendorLoggedOut, [
		check("email").not().isEmpty().withMessage("Please provide email.").isEmail().withMessage("Invalid email address.").trim().escape(),
		check("password").not().isEmpty().withMessage("Please provide password.").trim().escape()
	], async (req, res) => {
		try {
			let email = req.body.email
			let password = req.body.password

			const errors = validationResult(req)

			if(!errors.isEmpty()){
				return res.render("./vendor/login", {
					pageTitle: title.vendorLogin,
					errors: errors.array(),
					email
				})
			}
			const vendor = await Vendor.authenticate(email, password)
			
			if(!vendor){
				req.flash("danger", "Incorrect email or password!")
				return res.render("./vendor/login", {
					pageTitle: title.vendorLogin,
					email
				})
			}

			req.session.vendor = vendor

			res.redirect("/vendor/dashboard")
		} catch(e) {
			res.status(400).send("Unable to login!\n" + e)
		}
})


router.post("/register", isVendorLoggedOut, [
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

				res.render("./vendor/register", {
					pageTitle: title.vendorRegister,
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
				return res.render("./vendor/register", {
					pageTitle: title.vendorRegister,
					name,
					email,
					locId: "",
					locations
				}) 
			}

			const vendor = await Vendor.findOne({ email })

			if(vendor){
				const locations = await Location.find({}).sort({state: -1}).sort({city: -1})

				req.flash("danger", "Email address exists, use another.")
				return res.render("./vendor/register", {
					pageTitle: title.vendorRegister,
					name,
					email: "",
					locId,
					locations
				})
			}

			const newVendor = await new Vendor({
				name,
				email,
				password,
				location: locId
			})

			await newVendor.save()

			delete newVendor.password
			delete newVendor.avatar

			req.session.vendor = newVendor

			res.redirect("/vendor/dashboard")
		} catch(e) {
			res.status(400).send("Unable to register!\n" + e)
		}
})

router.get("/logout", isVendorLoggedIn, (req, res) => {
	req.session.vendor = null
	res.redirect("/vendor/login")
})

router.get("/dashboard", isVendorLoggedIn, async (req, res) => {
	try {
		res.render("./vendor/dashboard", {
			pageTitle: title.vendorDashboard
		})
	} catch(e) {
		res.status(400).send(`<h3>Something went wrong!</h3><p>${e}</p>`)
	}
})

router.get("/orders", isVendorLoggedIn, async (req, res) => {
	try{
		if(req.query.id && req.query.action) {
			const order = await Order.findById(req.query.id)
			let stg = ""
			if(!order) {
				req.flash("warning", "Invalid Operation!")
				return res.redirect("/vendor/orders")
			}

			switch(req.query.action) {
				case "accept":
					stg = "vendorAccepted"
					break
				case "dispatched":
					stg = "orderDispatched"
					break
				case "intransit": 
					stg = "inTransit"
					break
				case "reached":
					stg = "reached"
					break
				case "delivered":
					stg = "delivered"
					break
				default: 
					req.flash("danger", "Invalid Operation!")
					return res.redirect("/vendor/orders")
			}

			for (const stage of Object.entries(order.track)) {

				if(stage[0] == "$init")  {
					continue 
				}

				const today = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}))

				if(!stage[1].status) {
					if(stage[0] == stg) {

						order.track[stg] = {
							status: true,
							date: today,
						}

						if(stg == "vendorAccepted") {
							order.track[stg].vendorMsg = "Vendor Accepted"
						}

						await order.save()

						req.flash("success", "Order status changed successfully!")
						return res.redirect("/vendor/orders")
					} else {
						req.flash("danger", "Invalid Operation!")
						return res.redirect("/vendor/orders")
					}
				}
			}
		} else {
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
					return res.redirect("/vendor/dashboard")
				}

				const orders = await Order.find({ 
					vendor: req.session.vendor._id,
					$expr: expression
				}).sort({ createdAt: -1})
				

				for (const order of orders) {
					await order.populate("product", "name").populate("supervisor", "name").execPopulate()
				}

				res.render("./vendor/orders", {
					pageTitle: title.vendorOrders,
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
					vendor: req.session.vendor._id,
					$expr: {
						$and: [
							{$eq: [{$year: "$createdAt"}, year]},
							{$eq: [{$month: "$createdAt"}, month]}
						]
					}
				}).sort({ createdAt: -1})

				for (const order of orders) {
					await order.populate("product", "name").populate("supervisor", "name").execPopulate()
				}

				res.render("./vendor/orders", {
					pageTitle: title.vendorOrders,
					viewBy,
					month,
					monthName: monthArray[month - 1],
					year,
					monthArray,
					yearArray,
					orders
				})
			}
		}
	} catch(e) {
		res.status(500).send(`<h3>Something went wrong</h3><p>${e}</p>`)
	}
})

module.exports = router