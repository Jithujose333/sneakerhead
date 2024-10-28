const User = require('../../models/userSchema')
const bcrypt = require('bcrypt')
const crypto = require('crypto');
const dotenv = require('dotenv').config();
const nodemailer = require('nodemailer');



// Render forget password page
const getforgetPassword = async (req, res,next) => {
    try {
      res.render('forget-password');
    } catch (error) {
      console.error("Error rendering forget password page:", error);
      next(error)
    }
  };
  
  // Handle email validation and send reset link
  const forgetEmailValid = async (req, res,next) => {
    try {
      const { email } = req.body;
     
  
      // Assuming you have a User model
      const user = await User.findOne({ email: email.trim() });
    
      if (!user) {
        // If the email does not exist
        return res.render('forget-password', {
          message: "No account found with this email",
        });
      }
  
      // Generate password reset token and expiry (using crypto)
      const { resetToken, hashedToken } = generateResetToken();
  
      // Set token and expiry in the user's database record
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = Date.now() + 3600000; // Token valid for 1 hour
      await user.save();
  
      // Send reset email logic (use nodemailer)
      await sendResetEmail(user.email, resetToken);
  
      res.render('forget-password', {
        message: "Password reset link has been sent to your email",
      });
    } catch (error) {
      console.error("Error processing password reset:", error);
     next(error)
    }
  };
  
  // Utility to generate a secure token (using crypto)
  function generateResetToken() {
    const resetToken = crypto.randomBytes(32).toString('hex'); // Generate random token
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex'); // Hash the token
  
    return { resetToken, hashedToken };
  }
  
  // Function to send the reset email
  const sendResetEmail = async (toEmail, resetToken) => {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });
  
    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: toEmail,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset</h2>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <a href="http://localhost:3000/reset-password/${resetToken}">Reset Password</a>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };
  
    await transporter.sendMail(mailOptions);
  };
  
  
  const getResetPassword = async (req, res,next) => {
    try {
      const { token } = req.params;
  
      // Find the user by the hashed reset token and ensure token hasn't expired
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }, // Token should still be valid
      });
  
      if (!user) {
        return res.render('reset-password', {
          message: "Token is invalid or has expired",
        });
      }
  
      // Render the reset password page with the token
      res.render('reset-password', { token });
    } catch (error) {
      console.error("Error rendering reset password page:", error);
     next(error)
    }
  };
  
  
  
  const postResetPassword = async (req, res, next) => {
    try {
      const { token } = req.params;
      const { newPassword, confirmPassword } = req.body;
  
      if (newPassword !== confirmPassword) {
        return res.render('reset-password', {
          message: "Passwords do not match",
          token
        });
      }
  
      // Hash the token again to match what's in the database
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
      // Find user by the token and check if it hasn't expired
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      });
  
      if (!user) {
        return res.render('reset-password', {
          message: "Token is invalid or has expired",
        });
      }
  
      // If user is found, set the new password and clear the reset token fields
      user.password = await bcrypt.hash(newPassword, 10); // Ensure you hash the password before saving it
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
  
      await user.save();
  
      res.render('reset-password', { token,message: "Password changed successfully!" });
    } catch (error) {
      console.error("Error resetting password:", error);
     next(error)
    }
  };
  


module.exports ={
    getforgetPassword,
    forgetEmailValid,
    getResetPassword,
    postResetPassword
}
