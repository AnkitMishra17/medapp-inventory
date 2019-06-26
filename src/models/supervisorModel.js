const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const supervisorSchema = new mongoose.Schema({
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

supervisorSchema.methods.toJSON = function () {
	const supervisor = this

	const supervisorObject = supervisor.toObject()

	delete supervisorObject.password

	return supervisorObject
}

supervisorSchema.statics.authenticate = async (email, password) => {
	const supervisor = await Supervisor.findOne({ email })

	if(!supervisor){
		return null
	}

	const isMatch = await bcrypt.compare(password, supervisor.password)

	if(!isMatch){
		return null
	}

	return supervisor
}

supervisorSchema.pre("save", async function(next) {
	const supervisor = this

	if(supervisor.isModified("password"))
	{
		supervisor.password = await bcrypt.hash(supervisor.password, 8)
	}

	next()
})

const Supervisor = mongoose.model("Supervisor", supervisorSchema)

module.exports = Supervisor