const express = require("express")
const mongoose = require("mongoose")
const moment = require("moment")
const Admin = require("../models/adminModel")
const Order = require("../models/orderModel.js")
const Vendor = require("../models/vendorModel.js")
const Inventory = require("../models/inventoryModel.js")
const { isAdminLoggedIn, isAdminLoggedOut } = require("../middleware/auth.js")
const { check, validationResult } = require("express-validator/check");

const router = express.Router()

const title = {
	adminLogin: "Login | Admin",
	adminDashboard: "Dashboard | Admin",
	adminOrders: "Orders | Admin",
	adminApproveOrder: "Approve Order | Admin"
}

router.get("/login", isAdminLoggedOut, (req, res) => {
	res.render("./admin/login", {
		pageTitle: title.adminLogin,
		email: ""
	})
})

router.post("/login", isAdminLoggedOut, [
		check("email").not().isEmpty().withMessage("Please provide email.").isEmail().withMessage("Invalid email address.").trim().escape(),
		check("password").not().isEmpty().withMessage("Please provide password.").trim().escape()
	], async (req, res) => {
		try {
			let email = req.body.email
			let password = req.body.password

			const errors = validationResult(req)

			if(!errors.isEmpty()){
				return res.render("./admin/login", {
					pageTitle: title.adminLogin,
					errors: errors.array(),
					email
				})
			}
			const admin = await Admin.authenticate(email, password)
			
			if(!admin){
				req.flash("danger", "Incorrect email or password!")
				return res.render("./admin/login", {
					pageTitle: title.adminLogin,
					email
				})
			}

			req.session.admin = admin

			res.redirect("/medapp-inventory-admin/dashboard")
		} catch(e) {
			res.status(400).send("Unable to login!\n" + e)
		}
})


router.get("/logout", isAdminLoggedIn, (req, res) => {
	req.session.admin = null
	res.redirect("/medapp-inventory-admin/login")
})

router.get("/dashboard", isAdminLoggedIn, async (req, res) => {
	try {
		res.render("./admin/dashboard", {
			pageTitle: title.adminDashboard
		})
	} catch(e) {
		res.status(400).send(`<h3>Something went wrong!</h3><p>${e}</p>`)
	}
})

router.get("/orders", isAdminLoggedIn, async (req, res) => {
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
				return res.redirect("/admin/dashboard")
			}

			const orders = await Order.find({
				$expr: expression
			}).sort({ createdAt: -1})
			

			for (const order of orders) {
				await order.populate("product", "name").populate("vendor", "name").populate("supervisor", "name").execPopulate()
			}

			res.render("./admin/orders", {
				pageTitle: title.adminOrders,
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
				$expr: {
					$and: [
						{$eq: [{$year: "$createdAt"}, year]},
						{$eq: [{$month: "$createdAt"}, month]}
					]
				}
			}).sort({ createdAt: -1})

			for (const order of orders) {
				await order.populate("product", "name").populate("vendor", "name").populate("supervisor", "name").execPopulate()
			}

			res.render("./admin/orders", {
				pageTitle: title.adminOrders,
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

router.get("/orders/approve", isAdminLoggedIn, async (req, res) => {
	try{
		if(req.query.id) {
			const order = await Order.findById(req.query.id)

			await order.populate("product").execPopulate()

			if(!order) {
				req.flash("warning", "Invalid Operation!")
				return res.redirect("/medapp-inventory-admin/orders")
			}

			for (const stage of Object.entries(order.track)) {

				if(stage[0] == "$init")  {
					continue 
				}

				if(!stage[1].status) {
					if(stage[0] == "adminAccepted") {
						const vendors = await Vendor.find({}).sort({name: 1})

						for (const vendor of vendors) {
							await vendor.populate("location").execPopulate()
						}

						return res.render("./admin/approveOrder", {
							pageTitle: title.adminApproveOrder,
							order,
							vendors,
							vend: ""
						})
					} else {
						req.flash("danger", "Invalid Operation!")
						return res.redirect("/medapp-inventory-admin/orders")
					}
				}
			}
		} else {
			req.flash("danger", "Invalid Operation!")
			return res.redirect("/medapp-inventory-admin/orders")
		}
	} catch(e) {
		res.status(500).send(`<h3>Something went wrong</h3><p>${e}</p>`)
	}
})

router.post("/orders/approve", isAdminLoggedIn, async (req, res) => {
	try{
		if(req.query.id && req.body.vend) {
			const order = await Order.findById(req.query.id)
			const vendor = req.body.vend

			if(!order) {
				req.flash("warning", "Invalid Operation!")
				return res.redirect("/medapp-inventory-admin/orders")
			}

			for (const stage of Object.entries(order.track)) {

				if(stage[0] == "$init")  {
					continue 
				}

				if(!stage[1].status) {
					if(stage[0] == "adminAccepted") {
						const vendors = await Vendor.findById(vendor)

						if(!vendor) {
							req.flash("danger", "Invalid Operation!")
							return res.redirect("/medapp-inventory-admin/orders")
						}

						const today = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}))

						order.vendor = vendor

						order.track.adminAccepted = {
							status: true,
							date: today,
							adminMsg: "Admin Approved"
						}

						await order.save()

						req.flash("success", "Order approved successfully!")
						return res.redirect("/medapp-inventory-admin/orders")
					} else {
						req.flash("danger", "Invalid Operation!")
						return res.redirect("/medapp-inventory-admin/orders")
					}
				}
			}
		} else {
			req.flash("danger", "Invalid Operation!")
			return res.redirect("/medapp-inventory-admin/orders")
		}
	} catch(e) {
		res.status(500).send(`<h3>Something went wrong</h3><p>${e}</p>`)
	}
})

router.get("/orders/completed", isAdminLoggedIn, async (req, res) => {
	try{
		if(req.query.id) {
			const order = await Order.findById(req.query.id)

			if(!order) {
				req.flash("warning", "Invalid Operation!")
				return res.redirect("/medapp-inventory-admin/orders")
			}

			for (const stage of Object.entries(order.track)) {

				if(stage[0] == "$init")  {
					continue 
				}

				const today = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"}))

				if(!stage[1].status) {
					if(stage[0] == "orderCompleted") {


						order.track.orderCompleted = {
							status: true,
							date: today
						}

						await order.save()

						let inventory = await Inventory.findOne({ product: order.product, supervisor: order.supervisor })

						if(inventory) {
							inventory.totalQuantity += order.quantity
							inventory.leftQuantity += order.quantity

							inventory.history.push({
								quantity: order.quantity,
								detail: `${order.quantity} items added to inventory.`,
								date: today,
								isAdded: true
							})
						} else {
							inventory = new Inventory({
								product: order.product,
								supervisor: order.supervisor,
								totalQuantity: order.quantity,
								leftQuantity: order.quantity,
								history: [{
									quantity: order.quantity,
									detail: `${order.quantity} items added to inventory.`,
									date: today,
									isAdded: true
								}]
							})
						}

						await inventory.save()

						req.flash("success", "Order completed successfully!")
						return res.redirect("/medapp-inventory-admin/orders")
					} else {
						req.flash("danger", "Invalid Operation!")
						return res.redirect("/medapp-inventory-admin/orders")
					}
				}
			}
		} else {
			req.flash("danger", "Invalid Operation!")
			return res.redirect("/medapp-inventory-admin/orders")
		}
	} catch(e) {
		res.status(500).send(`<h3>Something went wrong</h3><p>${e}</p>`)
	}
})

module.exports = router