const mongoose = require('mongoose')
const fileHelper = require('../util/file')

const { validationResult } = require('express-validator/check')
const Product = require('../models/product');


exports.getAddProduct = (req, res, next) => {
  // if (!req.session.isLoggedIn) {
  //   return res.redirect('/login')
  // }
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    isAuthenticated: req.session.isLoggedIn,
    hasError: false,
    errorMessage: null,
    validationErrors:[]
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  //const imageUrl = req.body.image;
  const image = req.file; //object having information about the file (such as name, buffer data etc.)
  const price = req.body.price;
  const description = req.body.description;
  if (!image) {
    return res.status(422).render('admin/edit-product', { //422 means invalid input was provided from user side.
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description
      },
      errorMessage: 'Attached file is not an image.',
      validationErrors: []
    })
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
      
    })
  }

  const imageUrl = image.path; //path in file system of server

  const product = new Product({
   // _id: mongoose.Types.ObjectId('6021ad3e3d32c025008ecc3d'),
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user //this will automatically retrieve id
  });
  product
    .save()
    .then(result => {
      // console.log(result);
      console.log('Created Product');
      res.redirect('/admin/products');
    })
    .catch(err => {
    //   return res.status(500).render('admin/edit-product', { //code 500 signifies that a server side issue occured
    //   pageTitle: 'Add Product',
    //   path: '/admin/add-product',
    //   editing: false,
    //   hasError: true,
    //   product: {
    //     title: title,
    //     imageUrl: imageUrl,
    //     price: price,
    //     description: description
    //   },
    //   errorMessage: 'Database operation failed, please try again.',
    //   validationErrors: []  
    // })
      //res.redirect('/500'); //500 error page is for big problems
      //We could have used above statement in every catch block for returning 500 error page, but there is a better solution which prevents repetition of code
      //The solution is below
      console.log('What happened');
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error); //this tells express to skip all the next middlewares and execute the middleware handling errors (this triggers special error handling middleware)
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        isAuthenticated: req.session.isLoggedIn, //this can also be removed as we have set this value in every request through a middleware in app.js file
        hasError: false,
        errorMessage: null,
        validationErrors: []
      });
    })
    .catch(err => {
      //res.redirect('/500');
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render ('admin/edit-product', { //422 means invalid input was provided from user side.
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
      
    })
  }
  Product.findById(prodId)
    .then(product => {
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect('/')
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (image) {
        fileHelper.deleteFile(product.imageUrl)
        product.imageUrl = image.path;
      }
      return product.save().then(result => {
      console.log('UPDATED PRODUCT!');
      res.redirect('/admin/products');
    });
    })
    .catch(err => {
      //console.log(err)
      console.log('What happened')
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {
  Product.find({userId: req.user._id})
    // .select('title price -_id')
    // .populate('userId', 'name')
    .then(products => {
      console.log(products);
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
        isAuthenticated : req.session.isLoggedIn
      });
    })
    .catch(err => {
      //console.log(err)
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

// exports.postDeleteProduct = (req, res, next) => {
//   const prodId = req.body.productId;
//   Product.findById(prodId).then(product => {
//     if (!product) {
//       return next(new Error('Product not found.'))
//     }
//     fileHelper.deleteFile(product.imageUrl);
//     return Product.deleteOne({_id: prodId, userId:req.user._id})
//   }).then(() => {
//       console.log('DESTROYED PRODUCT');
//       res.redirect('/admin/products');
//     })
//     .catch(err => {
//       //console.log(err)
//       const error = new Error(err);
//       error.httpStatusCode = 500;
//       return next(error);
//     });
//   // Product.findByIdAndRemove(prodId)
//   //   .then(() => {
//   //     console.log('DESTROYED PRODUCT');
//   //     res.redirect('/admin/products');
//   //   })
//   //   .catch(err => console.log(err));
  
// };
exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId).then(product => {
    if (!product) {
      return next(new Error('Product not found.'))
    }
    fileHelper.deleteFile(product.imageUrl);
    return Product.deleteOne({_id: prodId, userId:req.user._id})
  }).then(() => {
      console.log('DESTROYED PRODUCT');
    //the below response is sent back to page from where the request was sent
    res.status(200).json({  //now we are not redirecting so we dont reload
        message: 'Success!'
      });
  })
    .then(data => {
      console.log(data);
      
    })
    .catch(err => {
      //console.log(err)
      res.status(500).json({message: 'Deleting product failed.'});
    });
  // Product.findByIdAndRemove(prodId)
  //   .then(() => {
  //     console.log('DESTROYED PRODUCT');
  //     res.redirect('/admin/products');
  //   })
  //   .catch(err => console.log(err));
  
};
