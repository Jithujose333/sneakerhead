const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');
const env = require('dotenv').config();



passport.use(new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:"/auth/google/callback"
},
async(accessToken,refreshToken,profile,done)=>{
    try {
        // let user = await User.findOne({googleId:profile.id})

        let user = await User.findOne({
            $or: [
                { googleId: profile.id },
                { email: profile.emails[0].value }
            ]
        });

       
        const profilePicture = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;
        if(user){
            await User.updateOne({  $or: [
                { googleId: profile.id },
                { email: profile.emails[0].value }
            ] }, { picture: profilePicture, googleId: profile.id });
            return done(null,user)
        }else{
            user = new User({
                name:profile.displayName,
                email:profile.emails[0].value,
                googleId:profile.id,
                picture:profilePicture
            })
            await user.save();
            return done(null,user)
        }
    } catch (error) {
        return done(error,null)
    }
}
));


passport.serializeUser((user,done)=>{
done(null,user.id)
})

passport.deserializeUser((id,done)=>{
    User.findById(id)
    .then(user=>{
        done(null,user)
    })
    .catch(err=>{
        done(err,null)
    })
})



module.exports = passport