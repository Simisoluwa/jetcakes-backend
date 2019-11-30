const express = require("express");
const router = express.Router();

//controller
const { signup, activation, signin } = require("../controllers/auth");

//validators
const {
  userSignupValidator,
  userSigninValidator
} = require("../validators/auth");
const { runValidation } = require("../validators");

router.post("/signup", userSignupValidator, runValidation, signup);
router.post("/account-activation", activation);
router.post("/signin", userSigninValidator, runValidation, signin);

module.exports = router;
