const User = require('../models/user');

exports.signup = (req,res) => {
    res.json({
        data: 'you hit the sign up endpoint'
    })
}