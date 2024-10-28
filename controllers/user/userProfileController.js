const User = require('../../models/userSchema')
const Address = require('../../models/addressSchema')
const bcrypt = require('bcrypt')
const Cart = require('../../models/cartSchema')
const crypto = require('crypto');

const dotenv = require('dotenv').config();
const nodemailer = require('nodemailer');




const getProfile = async (req,res,next) => {
    
    try {
if(req.user){
    req.session.user = req.user
}
        const userId = req.session.user
        const userData = await User.findOne({_id:userId})
        if (!userData) {
            return res.status(404).send('User not found'); // Handle case where user is not found
        }
        const firstName = userData.name.split(' ')[0];
        res.render('user-profile',{user:userData,firstName})
    
    } catch (error) {
       next(error)
    }
    
}

 





const editProfile = async (req, res, next) => {
  try {
    const userId = req.session.user; 
    const { name, email, mobile, currentPassword, newPassword } = req.body;

    

    const userData = await User.findOne({ _id: userId, isBlocked: false });

    if (!userData) {
      return res.status(404).json({ success: false, message: 'User not found or blocked' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (mobile) updates.phone = mobile;

    // Password handling
    if (newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, userData.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updates.password = hashedPassword;
    }

    

    // Perform the update
    await User.updateOne({ _id: userId }, { $set: updates });

    return res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
   next(error)
  }
};






const getAddress = async (req, res,next) => {
  try {
      const userId = req.session.user;

      if (!userId) {
          return res.status(401).json({ message: "Unauthorized" });
      }

      // Fetch all addresses for the user
      const userAddresses = await Address.find({ userId }).populate('userId');

      

      // Use optional chaining to safely extract the first name
      const firstName = userAddresses[0]?.userId?.name?.split(' ')[0] || "User"; // Fallback to "User"

      // Render the address page with multiple addresses
      res.render('address', { addresses: userAddresses, firstName,user:req.session.user });

  } catch (error) {
      console.error("Error fetching addresses:", error);
      next(error)
  }
};


const getaddAddress = async (req,res,next) => {
  try {
    const from = req.query.from || 'profile';
    const userId = req.session.user
    const userData = await User.findOne({_id:userId})
    
    const firstName = userData.name.split(' ')[0];
    const cartId = req.query.cartId;
    
    res.render('add-address',{userData,firstName,from:req.query.from,cartId,user:req.session.user})

  } catch (error) {
    next(error)
  }
  
}





const addAddress = async (req, res,next) => {
  try {
    const userId = req.session.user; 

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userData = await User.findById(userId);

    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    const { 
      name,
      houseName,
      locality,
      city, 
      state, 
      pincode,
      phone,
      altPhone,
      addressType = 'Home' // Allowing addressType to be dynamic, defaulting to 'Home'
    } = req.body; 

    // Log the incoming data for debugging
    console.log("Received address data:", req.body);

    // Validate required fields
    if (!name || !houseName || !city || !state || !pincode || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Create a new address document
    const newAddress = new Address({
      userId,
      addressType,
      name,
      houseName,
      locality,
      city,
      state,
      pincode,
      phone,
      altPhone
    });

    // Save the address to the database
    const savedAddress = await newAddress.save();

   
    await userData.save();
    if (req.body.from === 'checkout') {
      const cart= await Cart.findOne({userId})
      const cartId = cart._id
      // Redirect to the checkout page if adding an address for checkout
      return res.redirect(`/cart/checkout/${cartId}`);
  }else{

    // Respond with the saved address
    res.status(201).redirect('/profile/address'); // or use res.status(201).json(savedAddress) for API
  }
  } catch (error) {
    console.error("Error adding address:", error); // Improved error logging
    next(error)
  }
};






const getEditAddress = async (req, res,next) => {
  try {
    const addressId = req.query.id;
    console.log(addressId)
  
    const addressData = await Address.findById(addressId); // Use findById to get the address directly
console.log(addressData)
    if (!addressData) {
      return res.status(404).redirect('/pageNotFound'); // Redirect if address not found
    }

    const userId = req.session.user; // Get the user's ID from the session
    const userData = await User.findById(userId); // Fetch user data

    if (!userData) {
      return res.status(404).redirect('/pageNotFound'); // Redirect if user not found
    }

    const firstName = userData.name.split(' ')[0]; // Extract first name
    res.render('edit-address', {
       address: addressData, 
      firstName,
      from:req.query.from,
      cartId: req.query.cartId ,
      user:req.session.user
     }); // Pass address data and first name to the template
     
  } catch (error) {
    console.error("Error fetching address for editing:", error);
    next(error)
  }
};







const editAddress = async (req, res, next) => {
  try {
      const id = req.params.id; // Get address ID from request parameters
      const { name, houseName, locality, city, state, pincode, phone, altPhone ,from,cartId} = req.body;
      // const from = req.body.from || 'profile'; // Define from with a default value
      // const cartId = req.body.cartId;
      // Find existing address
      const existingAddress = await Address.findById(id);
      if (!existingAddress) {
          return res.status(404).json({ error: "Address does not exist" });
      }

      // Update the address in the database
      const updatedAddress = await Address.findByIdAndUpdate(id, { 
          name, 
          houseName, 
          locality, 
          city, 
          state, 
          pincode, 
          phone, 
          altPhone 
      }, { new: true });

      if (from === 'checkout') {
        return res.status(201).json({ message: "Address updated successfully", redirect: `/cart/checkout/${cartId}` });
       } else {
        return res.status(201).json({ message: "Address updated successfully", redirect: '/profile/address' });
       }
      // Return success response
      // return  res.status(201).redirect('/profile/address');
  } catch (error) {
      console.error("Error updating address:", error);
      return next(error);
  }
};


const deleteAddress = async (req,res,next) => {
  try {
    const addressId = req.params.id
    const deletedAddress = await Address.findByIdAndDelete(addressId)

    if (!deletedAddress) {
      return res.status(404).json({ error: "Address not found" });
  }

  return res.status(200).json({ success: "Address deleted successfully" });
  } catch (error) {
   next(error)
  }
}






module.exports = {
    getProfile,
    editProfile,
    getAddress,
    getaddAddress,
    addAddress,
    getEditAddress,
    editAddress,
    deleteAddress,
   
}