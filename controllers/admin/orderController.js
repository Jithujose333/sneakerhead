const Order = require('../../models/orderSchema')
const Wallet = require('../../models/walletSchema')





const getOrders = async (req, res) => {
    try {
        const search = req.query.search || ""; // Search query from the user
        const page = parseInt(req.query.page) || 1; // Current page number
        const limit = 4; // Limit of orders per page

        // Build the search filter (e.g., search by orderId or user email)
        const searchFilter = {
            $or: [
                { orderId: { $regex: search, $options: 'i' } }, // Search by orderId
                { 'userId.email': { $regex: search, $options: 'i' } } // Search by user email
            ]
        };

        // Find orders with pagination, search filter, and population of user and orderedItems.product fields
        const orders = await Order.find(searchFilter)
            .populate('userId') // Populate 'userId' to access 'email'
            .populate({
                path: 'orderedItems.product', // Populate products in ordered items
                select: 'ProductName salePrice' // Select necessary fields from Product
            })
            .skip((page - 1) * limit) // Skip previous pages
            .limit(limit) // Limit results to 'limit' per page
            .lean(); // Use lean for performance

        // Count the total number of orders for pagination
        const count = await Order.countDocuments(searchFilter);

        // Check if there are no results found
        const noResults = orders.length === 0;

       
        res.render('orders', {
            data: orders,
            currentPage: page, 
            totalPages: Math.ceil(count / limit), 
            search, 
            noResults, 
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).redirect('/pageerror'); 
    }
};


const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.orderStatus !== 'Shipped' && order.orderStatus !== 'Delivered') {
            order.orderStatus = 'Cancelled';
          
            await order.save();
            return res.status(200).json({ success: true, message: 'Order cancelled successfully' });
        } else {
            return res.status(400).json({ success: false, message: 'Cannot cancel a shipped or delivered order' });
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


const updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const newStatus = req.body.status;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).send('Order not found');
        }
if(newStatus==="Returned"){
   
    let wallet = await Wallet.findOne({ userId: order.userId });
    if (!wallet) {
        wallet = new Wallet({
            userId: order.userId,
            walletBalance: 0 // Initialize the balance
        });
    }
    wallet.walletBalance+=order.finalAmount

    wallet.transactions.push({
        type: 'credit',
        amount: order.finalAmount,
        description: `Returned order of ${order.orderId}`
    });
    await wallet.save()
}
        order.orderStatus = newStatus; // Update status
        await order.save();

        res.status(200).send('Order status updated successfully');
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).redirect('/pageerror'); 
    }
};






module.exports = {
    getOrders,
    cancelOrder,
    updateOrderStatus
}