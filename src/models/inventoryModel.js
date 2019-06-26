const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const inventorySchema = new mongoose.Schema({
	product: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		trim: true,
		ref: "Product"
	},
	supervisor: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		trim: true,
		ref: "Supervisor"
	},
	totalQuantity: {
		type: Number,
		default: 0
	},
	leftQuantity: {
		type: Number,
		default: 0
	},
	history: [{
		quantity: {
			type: Number,
			default: 0
		},
		detail: {
			type: String,
			required: true,
			trim: true
		},
		date: {
			type: Date,
			trim: true
		},
		isAdded: {
			type: Boolean,
			default: false
		},
		isUsed: {
			type: Boolean,
			default: false
		}
	}]
}, {
	timestamps: true
})

const Inventory = mongoose.model("Inventory", inventorySchema)

module.exports = Inventory