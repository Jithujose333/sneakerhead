const Order = require('../../models/orderSchema')
const User = require('../../models/userSchema')
const PDFDocument = require('pdfkit');




const getInvoice = async (req, res, next) => {
    try {
        const itemId = req.params.id; // Get item ID from request parameters
        const userid = req.session.user._id;

        // Find the order containing the specific item
        const order = await Order.findOne({
            "orderedItems.itemOrderId": itemId
        }).populate('orderedItems.product'); // Populate product details

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const userData = await User.findById(userid);

        const doc = new PDFDocument();
        res.setHeader('Content-Disposition', `attachment; filename=Invoice_${order.orderId}.pdf`);
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Title and Invoice Information
        doc.fontSize(20).text('INVOICE', { align: 'center' }).moveDown(1);
        doc.fontSize(12)
           .text(`Order ID: ${order.orderId}`, { align: 'right' })
           .text(`Order Date: ${new Date(order.invoiceDate).toLocaleDateString()}`, { align: 'right' })
           .text(`Invoice Date: ${new Date(order.invoiceDate).toLocaleDateString()}`, { align: 'right' })
           .moveDown(1);

        // Customer Information
        doc.text('Billing Address:')
           .text(` ${order.address.name}`)
           .text(` ${userData.email}`)
           .text(` ${order.address.houseName}, ${order.address.city}`)
           .text(` ${order.address.locality}, ${order.address.state}`)
           .text(` ${order.address.pincode}`)
           .text(` ${order.address.phone}`)
           .moveDown(1);

        // Line item headers
        const headers = ['Item', 'Size', 'Quantity', 'Unit Price', 'Discount', 'Total'];
        const columnWidths = [150, 80, 80, 80, 80, 80]; // Adjust column widths for the invoice
        let startX = 50; // Starting X position
        let startY = doc.y; // Start position for the table

        // Draw table headers and borders
        headers.forEach((header, i) => {
            doc.rect(startX, startY, columnWidths[i], 20).stroke(); // Border for each header
            doc.fontSize(10).text(header, startX + 5, startY + 5, { width: columnWidths[i], align: 'center' });
            startX += columnWidths[i];
        });

        doc.moveDown(0.5); // Space before listing items

        // Find the specific item to display
        const item = order.orderedItems.find(i => i.itemOrderId === itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found in the order' });
        }

        let discountPercentage = (order.discount * 100) / order.totalPrice;

        // Add the ordered item
        const product = item.product; // Populated product details
        const row = [
            product.productName,
            item.size,
            item.quantity,
            `Rs.${item.price.toFixed(2)}`,
            `Rs.${(item.price * (discountPercentage / 100)).toFixed(2)}`,
            `Rs.${(item.price * item.quantity - (item.price * (discountPercentage / 100))).toFixed(2)}`,
        ];

        startX = 50; // Reset X position for the row
        startY = doc.y; // Get current Y position for each row

        row.forEach((text, i) => {
            doc.rect(startX, startY, columnWidths[i], 20).stroke(); // Draw cell border
            doc.fontSize(10).text(text, startX + 5, startY + 5, { width: columnWidths[i], align: 'center' });
            startX += columnWidths[i];
        });

        doc.moveDown(1); // Space before totals section

        const subtotal = order.totalPrice;
        const discount = order.discount || 0;
        const total = order.finalAmount;

        // Set the X coordinate for right alignment
        const rightAlignX = 550; // Adjust this value based on your PDF width and layout
        const labelWidth = 150; // Width for labels like 'Subtotal', 'Discount', etc.

        // Display each total on the same line
        doc.fontSize(12)
           .text(`Subtotal: Rs.${subtotal.toFixed(2)}`, rightAlignX - labelWidth, doc.y, { width: labelWidth, align: 'right' });

        doc.moveDown(0.5); // Move slightly down for the next line

        doc.fontSize(12)
           .text(`Discount: Rs.${discount.toFixed(2)}`, rightAlignX - labelWidth, doc.y, { width: labelWidth, align: 'right' });

        doc.moveDown(0.5); // Move slightly down for the next line

        doc.fontSize(12)
           .text(`Total: Rs.${total.toFixed(2)}`, rightAlignX - labelWidth, doc.y, { width: labelWidth, align: 'right' });

        doc.moveDown(2); // Move down after totals

        // Footer
        doc.fontSize(10).text('Thank you for your purchase!', { align: 'center' });

        // Finalize the PDF and send it to the response
        doc.end();
    } catch (error) {
        console.error('Error generating invoice PDF:', error);
      next(error)
    }
};


module.exports = {
    getInvoice
}