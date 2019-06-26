const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const locationSchema = new mongoose.Schema({
	city: {
		type: String,
		unique: true,
		required: true,
		trim: true
	},
	state: {
		type: String,
		required: true,
		trim: true
	}
}, {
	timestamps: true
})

const Location = mongoose.model("Location", locationSchema)

module.exports = Location