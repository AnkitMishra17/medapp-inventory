const Vendor = require("../models/vendorModel")
const Supervisor = require("../models/supervisorModel")
const Admin = require("../models/adminModel")


// Function to check whether an authorized (vendor or supervisor or vendor)
async function isAuthorized (req, res, next) {
  try {
    if (!(req.session)) {
      return res.redirect("/");
    }else {
      next()
    }
  } catch(e) {
    res.status(400).send("Something Went Wrong!" + e)
  }
}

// Function to check whether the vendor is logged in
async function isVendorLoggedIn (req, res, next) {
  try {
    if (!(req.session && req.session.vendor)) {
      return res.redirect("/vendor/login");
    }else {
      const vendor = await Vendor.findOne({ _id : req.session.vendor._id })
      if(vendor) {
        next();
      } else {
        req.session.vendor = null;
        return res.redirect("/vendor/login");
      }
    }
  } catch(e) {
    res.status(400).send("Something Went Wrong!" + e)
  }
}

// Function to check whether the vendor is logged out
function isVendorLoggedOut (req, res, next) {
  if (req.session && req.session.vendor) {
    return res.redirect("/vendor/dashboard");
  }
  next();
}

// Function to check whether the supervisor is logged in
async function isSupervisorLoggedIn (req, res, next) {
  try {
    if (!(req.session && req.session.supervisor)) {
      return res.redirect("/supervisor/login");
    }else {
      const supervisor = await Supervisor.findOne({ _id : req.session.supervisor._id })
      if(supervisor) {
        next();
      } else {
        req.session.supervisor = null;
        return res.redirect("/supervisor/login");
      }
    }
  } catch(e) {
    res.status(400).send("Something Went Wrong!" + e)
  }
}

// Function to check whether the supervisor is logged out
function isSupervisorLoggedOut (req, res, next) {
  if (req.session && req.session.supervisor) {
    return res.redirect("/supervisor/dashboard");
  }
  next();
}

// Function to check whether the admin is logged in
async function isAdminLoggedIn (req, res, next) {
  try {
    if (!(req.session && req.session.admin)) {
      return res.redirect("/medapp-inventory-admin/login");
    }else {
      const admin = await Admin.findOne({ _id : req.session.admin._id })
      if(admin) {
        next();
      } else {
        req.session.admin = null;
        return res.redirect("/medapp-inventory-admin/login");
      }
    }
  } catch(e) {
    res.status(400).send("Something Went Wrong!" + e)
  }
}

// Function to check whether the admin is logged out
function isAdminLoggedOut (req, res, next) {
  if (req.session && req.session.admin) {
    return res.redirect("/medapp-inventory-admin/dashboard");
  }
  next();
}

module.exports = {
  isAuthorized,
  isVendorLoggedIn,
  isVendorLoggedOut,
  isSupervisorLoggedIn,
  isSupervisorLoggedOut,
  isAdminLoggedIn,
  isAdminLoggedOut
}