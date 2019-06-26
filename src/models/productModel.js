const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const productSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true
	}
}, {
	timestamps: true
})

const Product = mongoose.model("Product", productSchema)

module.exports = Product