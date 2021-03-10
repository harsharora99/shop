const fs = require('fs');
const path = require('path')
const stripe = require('stripe')(process.env.STRIPE_KEY) //private key(secret key(should not be in views)) 

const PDFDocument = require('pdfkit');

const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE = 1; //items displayed per page after pagination feature added  

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1; //used '+' sign to change string to integer
  let totalItems;

  Product.find().countDocuments().then(numProducts => {
    totalItems = numProducts;
    return Product.find()
    .skip((page - 1) * ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
  })
    .then(products => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'Products',
        path: '/products',
        // isAuthenticated : req.session.isLoggedIn
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems/ITEMS_PER_PAGE)

      });
    })
    .catch(err => {
      console.log(err);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',
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

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1; //used '+' sign to change string to integer
  let totalItems;

  Product.find().countDocuments().then(numProducts => {
    totalItems = numProducts;
    return Product.find()
    .skip((page - 1) * ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
  })
    .then(products => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        // isAuthenticated : req.session.isLoggedIn
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems/ITEMS_PER_PAGE)

      });
    })
    .catch(err => {
      //console.log(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user.populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,
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

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      console.log(result);
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => {
      //console.log(err)
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  let products;
  let total = 0;
    req.user.populate('cart.items.productId')
    .execPopulate()
      .then(user => {
        products = user.cart.items;
        total = 0;
        products.forEach(p => {
          total += p.quantity * p.productId.price;
        })
        return stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: products.map(p => {
            return {
              name: p.productId.title,
              description: p.productId.description,
              amount: p.productId.price * 100, //amount in cents
              currency: 'usd',
              quantity: p.quantity
            }
          }),
          success_url: req.protocol + '://' + req.get('host') + '/checkout/success',  //http://localhost:3000/checkout/success
          cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'  //http://localhost:3000/checkout/cancel 
        })
      }).then(session => {
        res.render('shop/checkout', {
          path: '/checkout',
          pageTitle: 'Checkout',
          products: products,
          totalSum: total,
          sessionId: session.id
        });
      })
      .catch(err => {
        console.log(err)
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
      });
}

exports.getCheckoutSuccess = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => {
      //console.log(err)
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err => {
      //console.log(err)
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders,
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

exports.getInvoice = (req, res, next) => {  //this sends a downloadable file to the user
  const orderId = req.params.orderId;
  Order.findById(orderId).then((order) => {
    if (!order) {
      return next(new Error('No order found.'));
    }
    if (order.user.userId.toString() !== req.user._id.toString()) {
      return next(new Error('Unauthorized'));
    }
    
    const invoiceName = 'invoice-' + orderId + '.pdf';
    const invoicePath = path.join('data', 'invoices', invoiceName)
    res.setHeader('Content-Type', 'application/pdf'); //extra information sent to browser about the file
    res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"'); //how content should be served to the client (inline means open the file in the browser itself)
  
    // fs.readFile(invoicePath, (err, data) => { //reads entire content into memory then return response (inefficient for large files)
    //   if (err) {
    //     return next(err);
    //   }
    //   res.setHeader('Content-Type', 'application/pdf'); //extra information sent to browser about the file
    //   res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"'); //how content should be served to the client (inline means open the file in the browser itself)
    //   //res.setHeader('Content-Disposition', 'attachment; filename="' + invoiceName + '"'); //how content should be served to the client (attachment means browser will show a downloadable file)
    //   res.send(data);
    // })
    
    // const file = fs.createReadStream(invoicePath); //we read file in stream (node will read file step by step in different chunks)
    // res.setHeader('Content-Type', 'application/pdf'); //extra information sent to browser about the file
    // res.setHeader('Content-Disposition', 'inline; filename="' + invoiceName + '"'); //how content should be served to the client (inline means open the file in the browser itself)
    // file.pipe(res);  //response is a writable stream and as we create file as a readable stream, it can pipe its data to res.
    //above we served files that already existed at the server side.
    //now we will generate files on the go when a request comes!
    const pdfDoc = new PDFDocument(); //a readable stream
    pdfDoc.pipe(fs.createWriteStream(invoicePath)); //this will save file on the server(in the file system)
    pdfDoc.pipe(res); //this will serve file to the client
    
    //pdfDoc.text('Hello world!'); //text writes in the pdf one line
    pdfDoc.fontSize(26).text('Invoice', {
      underline: true
    });
    pdfDoc.text('--------------------------');
    let totalPrice = 0;
    order.products.forEach(prod => {
      totalPrice += prod.quantity * prod.product.price;
      pdfDoc.fontSize(14).text(prod.product.title + ' - ' + prod.quantity + ' x ' + '$' + prod.product.price);
    })
    pdfDoc.text('--------------------------');
    pdfDoc.fontSize(20).text('Total Price $' + totalPrice);
    pdfDoc.end(); //file will be saved and response will e sent

  }).catch(err => {
    return next(err);
  })
} 