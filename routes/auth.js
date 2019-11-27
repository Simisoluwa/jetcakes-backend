const express = require('express')
const router = express.Router()

//controller
const { signup } = require('../controllers/auth')

//validators
const {userSignupValidator} = require('../validators/auth')
const {runValidation} = require('../validators')

router.post('/signup', userSignupValidator, runValidation, signup);

module.exports = router;