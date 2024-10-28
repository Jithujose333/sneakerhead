

function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    if(req.session.admin){
    res.status(statusCode).redirect('/admin/pageerror');
    }else{
        res.status(statusCode).redirect('/pageNotFound')  
    }
}



module.exports ={
    errorHandler

}