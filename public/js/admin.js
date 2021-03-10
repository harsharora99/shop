const deleteProduct = (btn) => {
    console.log('Clicked');
    console.log(btn);
    const prodId = btn.parentNode.querySelector('[name=productId]').value; //gives product id
    const csrf = btn.parentNode.querySelector('[name=_csrf]').value; //gives csrf value
    const productElement = btn.closest('article');


    fetch('/admin/product/' + prodId, { //here we can configure request
        method: 'DELETE',
        headers: {
            'csrf-token':csrf //csurf handler will automatically look for this
        }
    }).then(result => {
        //console.log(result);
        return result.json();
    })
        .then(data => {
            //console.log(data);
            productElement.remove();
        })
        .catch(err => {
            console.log(err);
        })
};