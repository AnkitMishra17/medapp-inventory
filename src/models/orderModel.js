const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const orderSchema = new mongoose.Schema({
	product: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		trim: true,
		ref: "Product"
	},
	quantity: {
		type: Number,
		default: 0
	},
	supervisor: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
		trim: true,
		ref: "Supervisor"
	},
	vendor: {
		type: mongoose.Schema.Types.ObjectId,
		default: undefined,
		trim: true,
		ref: "Vendor"
	},
	invoiceImage: {
		type: Buffer
	},
	track: {
		ordered: {
			status: {
				type: Boolean,
				default: false
			},
			superMsg: {
				type: String,
				default: "Order Requested",
				trim: true
			},
			adminMsg: {
				type: String,
				default: "Order Requested"
			},
			date: {
				type: Date,
				default: new Date()
			}
		},
		adminAccepted: {
			status: {
				type: Boolean,
				default: false
			},
			superMsg: {
				type: String,
				default: "Admin accepted",
				trim: true
			},
			adminMsg: {
				type: String,
				default: "Approve order",
				trim: true
			},
			vendorMsg: {
				type: String,
				default: "Admin accepted",
				trim: true
			},
			date: {
				type: Date,
				default: new Date()
			}
		},
		vendorAccepted: {
			status: {
				type: Boolean,
				default: false
			},
			superMsg: {
				type: String,
				default: "Vendor accepted and in process",
				trim: true
			},
			adminMsg: {
				type: String,
				default: "Vendor accepted and in process",
				trim: true
			},
			vendorMsg: {
				type: String,
				default: "Accept Order",
				trim: true
			},
			date: {
				type: Date,
				default: new Date()
			}
		},
		orderDispatched: {
			status: {
				type: Boolean,
				default: false
			},
			superMsg: {
				type: String,
				default: "Order Dispatched",
				trim: true
			},
			adminMsg: {
				type: String,
				default: "Order Dispatched",
				trim: true
			},
			vendorMsg: {
				type: String,
				default: "Order Dispatched",
				trim: true
			},
			date: {
				type: Date,
				default: new Date()
			}
		},
		inTransit: {
			status: {
				type: Boolean,
				default: false
			},
			superMsg: {
				type: String,
				default: "Order in transit",
				trim: true
			},
			adminMsg: {
				type: String,
				default: "Order in transit",
				trim: true
			},
			vendorMsg: {
				type: String,
				default: "Order in transit",
				trim: true
			},
			date: {
				type: Date,
				default: new Date()
			}
		},
		reached: {
			status: {
				type: Boolean,
				default: false
			},
			superMsg: {
				type: String,
				default: "Order Reached City",
				trim: true
			},
			adminMsg: {
				type: String,
				default: "Order Reached City",
				trim: true
			},
			vendorMsg: {
				type: String,
				default: "Order Reached City",
				trim: true
			},
			date: {
				type: Date,
				default: new Date()
			}
		},
		delivered: {
			status: {
				type: Boolean,
				default: false
			},
			superMsg: {
				type: String,
				default: "Order delivered",
				trim: true
			},
			adminMsg: {
				type: String,
				default: "Order delivered",
				trim: true
			},
			vendorMsg: {
				type: String,
				default: "Order delivered",
				trim: true
			},
			date: {
				type: Date,
				default: new Date()
			}
		},
		invoiceUploaded: {
			status: {
				type: Boolean,
				default: false
			},
			superMsg: {
				type: String,
				default: "Upload Invoice",
				trim: true
			},
			adminMsg: {
				type: String,
				default: "Order Invoice uploaded",
				trim: true
			},
			vendorMsg: {
				type: String,
				default: "Order Invoice uploaded",
				trim: true
			},
			date: {
				type: Date,
				default: new Date()
			}
		},
		orderCompleted: {
			status: {
				type: Boolean,
				default: false
			},
			superMsg: {
				type: String,
				default: "Order Completed",
				trim: true
			},
			adminMsg: {
				type: String,
				default: "Order Completed",
				trim: true
			},
			vendorMsg: {
				type: String,
				default: "Order Completed",
				trim: true
			},
			date: {
				type: Date,
				default: new Date()
			}
		}
	}
}, {
	timestamps: true
})

const Order = mongoose.model("Order", orderSchema)

module.exports = Order