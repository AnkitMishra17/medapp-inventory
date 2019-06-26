const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const vendorSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true
	},
	email: {
		type: String,
		unique: true,
		required: true,
		trim: true
	},
	password: {
		type: String,
		required: true,
		trim: true
	},
	location: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Location",
		required: true,
		trim: true
	}
}, {
	timestamps: true
})

// vendorSchema.virtual("loc", {
// 	ref: "Location",
// 	localField: "location",
// 	foreignField: "_id"
// })

vendorSchema.methods.toJSON = function () {
	const vendor = this

	const vendorObject = vendor.toObject()

	delete vendorObject.password

	return vendorObject
}

vendorSchema.statics.authenticate = async (email, password) => {
	const vendor = await Vendor.findOne({ email })

	if(!vendor){
		return null
	}

	const isMatch = await bcrypt.compare(password, vendor.password)

	if(!isMatch){
		return null
	}

	return vendor
}

vendorSchema.pre("save", async function(next) {
	const vendor = this

	if(vendor.isModified("password"))
	{
		vendor.password = await bcrypt.hash(vendor.password, 8)
	}

	next()
})

const Vendor = mongoose.model("Vendor", vendorSchema)

module.exports = Vendor