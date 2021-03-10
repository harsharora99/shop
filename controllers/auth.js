const crypto = require('crypto') //inbuilt node library (we dont need to install through npm) which helps us in creating unique, secure and random values

const bcrypt = require('bcryptjs')
const nodemailer = require('nodemailer')
const sendgridTransport = require('nodemailer-sendgrid-transport')
const {validationResult} = require('express-validator/check') //validationResult stores the errors (if any) found aduring validations


const User = require('../models/user')

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: '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', //this value we get from our sendgrid account
    }
}))


exports.getLogin = (req, res, next) => {
    //console.log(req.get('Cookie')) //we print cookie that is present in the request header
    //const isLoggedIn = req.get('Cookie').trim().split('=')[1] === 'true'
    // let isLoggedIn = false
    // if (req.get('Cookie')) {
    //     isLoggedIn = req.get('Cookie').trim().split('=')[1] === 'true'
    // }
    //console.log(req.session.isLoggedIn)
    let message = req.flash('error') //whatever is stored in error field of the session will be assigned here and after that this field will be removed
    if (message.length > 0) {
        message = message[0]
    }
    else {
        message = null
    }
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: message,
        oldInput: {
            email: "",
            password: "",
        },
        validationErrors:[]
    })
}

exports.getSignup = (req, res, next) => {
    let message = req.flash('error')
    if (message.length > 0) {
        message = message[0] 
    }
    else {
        message = null
    }
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: message,
        oldInput: {
            email: "",
            password: "",
            confirmPassword:""
        },
        validationErrors: []
    })
}


exports.postLogin = (req, res, next) => {
    //req.isLoggedIn = true
    //res.setHeader('Set-Cookie', 'loggedIn=true') //here we set a cookie in the browser
    //res.setHeader('Set-Cookie'. 'loggedIn=true; Max-Age=10') //cookie which expires in 10s
    //res.setHeader('Set-Cookie'. 'loggedIn=true; Secure') //cookie which is set only if the page we are on is https secure
    //res.setHeader('Set-Cookie'. 'loggedIn=true; HttpOnly') //cookie which is can not be accessed through client side javascript, but still can easily be read and even manipulated in developer tools in browser 
    
    //After sessions were introduced
    //req.session.isLoggedIn = true
    //this session object was added to evey req object due to initialisation of session middleware in app.js
    //using above statement a session cookie(which gets expired when the browser is closed) will be added to the client side that will identify the current user to the server
    //this cookie is saved only for this user only, we can check this by sending getLogin request from other browser and check their if the req.session.isLoggedIn is true or false
    //Note session method is different from saving in req body method as in that case we were not able to access that isloggedin variable in different requests despite being all from the same user as requests are independent. but using session we saved a hashed session cookie on the client or user or browser side and we are able to access req.session.isLoggedIn across all the requests of the same user

    const email = req.body.email
    const password = req.body.password
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password
            },
            validationErrors: errors.array()
        })
    }
    User.findOne({ email: email })
        .then(user => {
            if (!user) {
                // req.flash('error', 'Invalid email or password.') //now this key-value pair will be in the session untill we use it
                return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: 'Invalid email or password.',
            oldInput: {
                email: email,
                password: password,
                confirmPassword: req.body.confirmPassword
            },
            validationErrors: []
        })
            }
            bcrypt.compare(password, user.password).then(isMatch => {
                if (isMatch) {
                    req.session.isLoggedIn = true
                    req.session.user = user
                    return req.session.save((err) => {
                        console.log(err)
                        res.redirect('/')
                    }) 
                }
                // req.flash('error', 'Invalid email or password.')
                // res.redirect('/login')
                return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: 'Invalid email or password.',
            oldInput: {
                email: email,
                password: password
            },
            validationErrors: []
        })
            }).catch(err => {
                console.log(err)
                res.redirect('/login')
            })
          
           
        })
        .catch(err => {
            //console.log(err)
            const error = new Error(err);
            error.httpStatusCode = 500;
             return next(error);
        })
}
    

exports.postSignup = (req, res, next) => {
    const email = req.body.email
    const password = req.body.password
   
    const errors = validationResult(req) //validation middleware in the auth routes stores the errors in the req after doing validations and now this function will get all those errors(array of objects) extracted from req
    console.log(errors.array())
    if (!errors.isEmpty()) {
        return res.status(422).render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: errors.array()[0].msg,
        oldInput: {
            email: email,
            password: password,
            confirmPassword: req.body.confirmPassword
            },
        validationErrors: errors.array()
    })   //422 states that validation failed
    }
    
    
        bcrypt.hash(password, 12).then(hashedPassword => { //hashedPassword is made using hashing techniques and is irreversible unlike encryptions which are reversible)
            const user = new User({
                email: email,
                //password: password,
                password: hashedPassword,
                cart: { item: [] }
            })
            return user.save()

        }).then(result => {
            res.redirect('/login') //here we redirect first and dont block the redirect to then as sending mail may take lot of time. If we changed this statement to then after sending mail it may take lot of time blocking the redirect!
            return transporter.sendMail({
                to: email,
                from: 'hdsingharora99@gmail.com',
                subject: 'Signup succeeded!',
                html: '<h1>You successfully signed up!</h1>'
            })
                .catch(err => {
                    //console.log(err)
                    const error = new Error(err);
                    error.httpStatusCode = 500;
                   return next(error);
                })
    })

}


exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        //now req.session is not defined
        console.log(err)
        res.redirect('/')

    })//this is an async method which is automatically created in session object to delete the session from the backend database or memory (as if we only delete cookie from frontend that will not delete the mapped session in the backend and that is waste of resources) as well as remove the req.session data
    //note that the cookie will not be deleted by this method but now the cookie will be useless as it has no maping session in the backend and the cookie will also be overwritten if the user logins again and will be deleted if user deletes it manually or closes the browser
}

exports.getReset = (req, res, next) => {
    let message = req.flash('error')
    if (message.length > 0) {
        message = message[0]
    }
    else {
        message = null
    }
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessage: message
    })
}

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err)
            return res.redirect('/reset')
        }
        const token = buffer.toString('hex') //converts hex buffer to string in ascii format
        User.findOne({ email: req.body.email }).then(user => {
            if (!user) {
                req.flash('error', 'No account with that email found')
                return res.redirect('/reset')
            }
            user.resetToken = token
            user.resetTokenExpiration = Date.now() + 3600000 //expiration time is one our after execution of this statement (3600000 is 1 hour in miliseconds)
            return user.save()
        }).then(result => {
            res.redirect('/') //here we rediredt first and then use sendMail api as we dont want to just freeze everything for the user till it gets the mail
            transporter.sendMail({
                to: req.body.email,
                from: 'hdsingharora99@gmail.com',
                subject: 'Password reset',
                html: `
                    <p>You requested a password reset</p>
                    <p>Click this <a href='http://localhost:3000/reset/${token}'>link</a> link to set a new password. (Link is valid only for 1 hour)</p>
                `
            })
        }).catch(err => {
            //console.log(err)
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        })
    })
}

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({
        resetToken: token, resetTokenExpiration: {
        $gt: Date.now()
        }
    }).then(user => {
        let message = req.flash('error')
        if (message.length > 0) {
            message = message[0]
        }
        else {
            message = null
        }
        res.render('auth/new-password', {
            path: '/new-password',
            pageTitle: 'New Password',
            errorMessage: message,
            userId: user._id.toString(), //to convert from ObjectId to string
            passwordToken: token
        })

    }).catch(err => {
        //console.log(err)
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    })
}

exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId
    console.log(userId)
    const passwordToken = req.body.passwordToken;
    let resetUser
    User.findOne({
        resetToken: passwordToken, resetTokenExpiration: {
            $gt: Date.now()
        },
        _id: userId
    })
    .then(user => {
        resetUser = user
        return bcrypt.hash(newPassword, 12)
    })
        .then(hashedPassword => {
        console.log(resetUser)
        resetUser.password = hashedPassword
        resetUser.resetToken = null
        resetUser.resetTokenExpiration = undefined //setting this to undefined will tell mongoose not to save this key
        return resetUser.save()
    })
    .then(result => {
        res.redirect('/login')    
    })
    .catch(err => {
        //console.log(err)
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    })
}