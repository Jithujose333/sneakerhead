const Order = require('../../models/orderSchema')
const Wallet = require('../../models/walletSchema')
const Product = require('../../models/productSchema')





const getOrders = async (req, res, next) => {
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
      next(error)
    }
};






const cancelOrder = async (req, res, next) => {
    try {
        const itemId = req.params.id; // Assume you're getting the itemId from request parameters
        const order = await Order.findOne({
            "orderedItems.itemOrderId": itemId
        });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Find the specific item within the order's orderedItems array
        const item = order.orderedItems.find(i => i.itemOrderId === itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found in the order' });
        }

        // Check if the item has a "Return Request" status, if so, update it to "Delivered"
        if (item.itemStatus === 'Return Request') {
            item.itemStatus = 'Delivered';
            await order.save();
            return res.status(200).json({ success: true, message: 'Return Request Cancelled' });
        }

        // Check if the item is eligible for cancellation
        if (item.itemStatus !== 'Shipped' && item.itemStatus !== 'Delivered'&&item.itemStatus !== 'Returned'
           && order.orderStatus !== 'Shipped' && order.orderStatus !== 'Delivered'&&order.orderStatus !== 'Returned'
        ) {
            item.itemStatus = 'Cancelled';

            // Process refund only if payment method is not COD
            if (order.paymentMethod !== 'COD') {
                item.itemPaymentStatus = 'Refunded';

                // Update stock for the product if needed
                const product = await Product.findById(item.product);
                if (product) {
                    const sizeEntry = product.sizes.find(s => s.size === item.size);
                    if (sizeEntry) {
                        sizeEntry.quantity += item.quantity;
                    }
                    await product.save();
                }

                // Adjust wallet balance for the cancelled item
                let wallet = await Wallet.findOne({ userId: order.userId });
                if (!wallet) {
                    wallet = new Wallet({
                        userId: order.userId,
                        walletBalance: 0
                    });
                }

                // Calculate discounted price if coupon was applied
                let discountedPrice = 0;
                if (order.couponApplied) {
                    discountedPrice = (item.price * item.quantity) * order.couponPercentage / 100;
                }
                const refundAmount = (item.price * item.quantity) - discountedPrice;
                wallet.walletBalance += refundAmount;
                wallet.transactions.push({
                    type: 'credit',
                    amount: refundAmount,
                    description: `Cancelled order of item ${item.itemOrderId}`
                });
                await wallet.save();
            }
            // Check if all items in the order are now cancelled or refunded
            if (order.orderedItems.every(i => i.itemStatus === 'Cancelled' || i.itemStatus === 'Returned')) {
                order.orderStatus = 'Cancelled';
                order.paymentStatus = 'Refunded';
            }

            // Save the order with the updated item status
            await order.save();

            return res.status(200).json({ success: true, message: 'Item cancelled successfully' });
        } else {
            return res.status(400).json({ success: false, message: 'Cannot cancel a shipped or delivered item' });
        }
    } catch (error) {
        console.error('Error cancelling item:', error);
        next(error)
    }
};





const updateOrderStatus = async (req, res, next) => {
    try {
        const itemId = req.params.id; // Assume you're getting the itemId from request parameters
        console.log(itemId)
        const newStatus = req.body.status;
        console.log(newStatus)

        // Find the order containing the specific ItemId in the orderedItems array
        const order = await Order.findOne({
            "orderedItems.itemOrderId": itemId
        });

        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Find the specific item within the order's orderedItems array
        const item = order.orderedItems.find(i => i.itemOrderId === itemId);
        if (!item) {
            return res.status(404).send('Item not found in the order');
        }

        // Update the item-specific status and handle "Returned" status logic
        item.itemStatus = newStatus;

        if(newStatus === "Delivered"){
            item.itemPaymentStatus="Completed"
            if (order.orderedItems.every(item => item.itemPaymentStatus === 'Completed' && item.itemStatus === 'Delivered')) {
                order.paymentStatus = 'Completed';
                order.orderStatus = 'Delivered';
            }
        }
        if (newStatus === "Returned") {
            // Update product stock and wallet for returned items
            const product = await Product.findById(item.product);
            if (product) {
                const sizeEntry = product.sizes.find(s => s.size === item.size);
                if (sizeEntry) {
                    sizeEntry.quantity += item.quantity;
                }
                await product.save();
            }

            let wallet = await Wallet.findOne({ userId: order.userId });
            if (!wallet) {
                wallet = new Wallet({
                    userId: order.userId,
                    walletBalance: 0
                });
            }
            var discountedPrice = 0
            if(order.couponApplied===true){
                var discountedPrice =(item.price* item.quantity)*order.couponPercentage/100;
             }
            wallet.walletBalance +=(item.price * item.quantity)-discountedPrice;

            wallet.transactions.push({
                type: 'credit',
                amount:(item.price * item.quantity)-discountedPrice,
                description: `Returned order of ${item.itemOrderId}`
            });
            await wallet.save();
            item.itemPaymentStatus = 'Refunded';
        }
        if (order.orderedItems.every(item => item.itemPaymentStatus === 'Refunded' && item.itemStatus === 'Returned')) {
            order.paymentStatus = 'Refunded';
            order.orderStatus = 'Returned';
        }
        

        // Save the order with the updated item status
        await order.save();

        res.status(200).send('Order status updated successfully');
    } catch (error) {
        console.error('Error updating order status:', error);
        next(error)
    }
};






module.exports = {
    getOrders,
    cancelOrder,
    updateOrderStatus
}