const path = require('path');
const fs = require('fs');
const https = require('https'); //this helps us to spinup a https server
//
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session') //a middleware to initialise sessions in our project. this middleware lets us save sessions in code memory(like variables)

const MongoDBStore = require('connect-mongodb-session')(session) //require('connect-mongodb-session) returns a function which is then executed by passing session which returns a constructor
const csrf = require('csurf') //for making the application csrf-proof
const flash = require('connect-flash')
const multer = require('multer')
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan')

const errorController = require('./controllers/error');
const User = require('./models/user');

const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.kjmvg.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`; //stores connection url to mongodb database created by us online on atlas


//below we do all the initialisations
const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions' //collection in which the sessions will be stored in the mongo database
})

const csrfProtection = csrf();

// const privateKey = fs.readFileSync('server.key'); //this file is read syncronously before starting the server because it is necessary
// const certificate = fs.readFileSync('server.cert')

const fileStorage = multer.diskStorage(  //here we define storage engine
  { //destination and filename functions are called by multer
  destination: (req, file, cb) => {
    cb(null, 'images'); //now file will be stored in 'images' folder
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname);
  }
  })

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
    cb(null, true); //if we want to store file
  } else {
    cb(null, false); //if we dont want to store file
  }
}

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
//const { error } = require('console');

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {
  flags: 'a'
})//this is used for request logging in a file
//flags:'a' means new data will be appended and not overwrite

//now below are some middlewares which are used on every request that is sent to the server 
app.use(helmet());
app.use(compression()); //image files are not compressed
app.use(morgan('combined', {
  stream: accessLogStream
})); //request logs will be written in the access.log file

app.use(bodyParser.urlencoded({ extended: false }));
//app.use(multer().single('image')) //we extract only one file which is named 'image' in the form
app.use(multer({ storage: fileStorage, fileFilter: fileFilter}).single('image'))
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images'))); 
//app.use(session({secret: 'my secret', resave: false, saveUninitialized: false}))  //the value of secret field can be any string of our choice(preferably should be ling enough)
//resave: false tells that the session should be resaved only if there is some change in the session and not on every request-response (improves performance)
//now session middleware is initialised and now onwards a session object will be added to every request object sent


//above statement stored sessions in memory
//below statement lets us save in our mongo database with the help of connect-mongodb-session 3rd party package
app.use(
  session({secret: 'my secret', resave: false, saveUninitialized: false, store: store})
) //for every incoming request, this middleware basically look for existence of session cookie in request and if there exists such a cookie, it will fetch session data from mongodb database(remember it does not use mongoose for doing so, so the object returned will be a simple javascript object containing only data and not the functions of mongoose model) and will store that data  in req.session

//now the req object will have session object if the above middleware detects a fitting session in the database

app.use(csrfProtection) //this will add a csrfToken() field to every req object i.e. now each req will have req.csrfToken()
app.use(flash())


app.use((req, res, next) => { //this middleware sets the value of variables that should be passed to every view rendered so that we dont have to pass them manually in every render statement
  res.locals.isAuthenticated = req.session.isLoggedIn
  res.locals.csrfToken = req.csrfToken() //csrf function was added to every request when its middleware was used
  next()
})
app.use((req, res, next) => {
  //thro new Error('Sync Dummy) //triggers error handling middleware
  if (!req.session.user) {
    return next()
  }
  User.findById(req.session.user._id)
  .then(user => {
    if (!user) {
      return next();        
    }
    req.user = user;
    next();
  })
  .catch(err => {
    //We come in this block if we had some technical issue in connecting to the database
    //throw new Error(err);
    console.log('What happened');
    next(new Error(err));
      });
})



//now we bringin different path specific middlewares
app.use('/admin', adminRoutes);
app.use(shopRoutes)
app.use(authRoutes)

app.get('/500', errorController.get500)

app.use(errorController.get404); //this is a normal 'catch-all' middleware which triggers for any requests that are not handled by above middlewares

app.use((error, req, res, next) => { //this is a special middleware(error-handling middleware having 4 arguments) which is executed by express whenever next(error) having error as argument is called
  //res.status(error.httpStatusCode).render(...);
  //res.redirect('/500');
  res.status(500).render('500', { pageTitle: 'Error!', path: '/500', isAuthenticated : req.session. isLoggedIn });
})

mongoose
  .connect(
    MONGODB_URI
  , {useNewUrlParser: true})
  .then(result => {
    // https.createServer({
    //   key: privateKey,
    //   cert: certificate
    // }, app).listen(process.env.PORT || 3000); //here we start our server
    // //app is our express request handler
    app.listen(process.env.PORT || 3000);
  })
  .catch(err => {
    console.log(err);
  });
