const Order = require('../../models/orderSchema')

const getOrders = async (req, res) => {
    try {
        const userId = req.session.user;
        const orders = await Order.find({ userId }).populate('orderedItems.product'); // Ensure products are populated
        console.log(orders); 
        res.render('user-orders', {
            firstName: req.firstName,
            orders: orders
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.redirect('/pageError');
    }
}





module.exports = {
    getOrders
}