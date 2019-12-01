const {check} = require('express-validator');

exports.userSignupValidator = [
    check('name')
    .not()
    .isEmpty()
    .withMessage('Name is required.'),

    check('email')
    .isEmail()
    .withMessage('Your email must be a valid email address.'),

    check('password')
    .isLength({min: 6})
    .withMessage('Password must be a minimum of 6 characters.'),
];

exports.userSigninValidator = [
    check('email')
    .isEmail()
    .withMessage('Your email must be a valid email address.'),

    check('password')
    .isLength({min: 6})
    .withMessage('Password must be a minimum of 6 characters.'),
]

exports.forgotPasswordValidator = [
    check('email')
    .not()
    .isEmpty()
    .isEmail()
    .withMessage('Your email must be a valid email address.'),
]

exports.resetPasswordValidator = [
    check('newPassword')
    .not()
    .isEmpty()
    .isLength({ min: 6})
    .withMessage('Password must be at least 6 characters long'),
]