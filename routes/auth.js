const express = require('express')
const {check, body} = require('express-validator/check') //require returns an object which we destructure
//check is a function which returns a middleware when called


const authController = require('../controllers/auth')
const User = require('../models/user')

const router = express.Router()


router.get('/login', authController.getLogin)

router.post('/login',
    [body('email')
        .isEmail()
        .withMessage('Please enter a valid email address.')
        .normalizeEmail(),
        body('password', 'Password has to be valid.')
            .isLength({ min: 5 })
            .isAlphanumeric()
            .trim()
    ], authController.postLogin)

router.post('/logout', authController.postLogout)

router.get('/signup', authController.getSignup) 

router.post('/signup', [check('email').isEmail().withMessage('Please enter a valid email').custom((value, { req }) => { //custom validator
    //value here will certainly be email
    // if (value === 'test@test.com') {
    //     throw new Error('This email address is forbidden.')
    // }
    // return true //returns true if its fine
    return User.findOne({ email: value }).then(userDoc => {
        if (userDoc) {
            return Promise.reject('E-Mail exists already, please pick a different one.') //will throw an error that will be catched in catch block
        }
    })
}).normalizeEmail(),
body('password', 'Please enter a password with only numbers and text and at least 5 characters.').isLength({
    min: 5
}).isAlphanumeric().trim(),
    body('confirmPassword').trim().custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords have to match!') //this error is handled behind the scenes by validation module
        }
        return true
    })
], authController.postSignup) //the name 'email' is used because email is sent as 'email' property in request body 
//the 'check' checks the body, param, queryparameters, cookies, header etc to find the given field (for e.g email in this case)
//isEmail validates if the value in 'email' field of req object is email or not, if no an error is added to the errors array in req automatically
//withMessage helps to configure the error message
//we can chain several validators on the same field
//we use custom to make a custom validator 
//we can have an array of validators each element in the array checking for some specific field
//body checks the value only in the body of req for the given field
router.get('/reset', authController.getReset)  

router.post('/reset', authController.postReset)

router.get('/reset/:token', authController.getNewPassword)

router.post('/new-password', authController.postNewPassword)



module.exports = router