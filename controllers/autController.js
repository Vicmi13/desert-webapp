const  passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require ('../handlers/mail.js')

exports.login = passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: 'Failed Login!',
    successRedirect: '/',
    successFlash: 'You are now logged in'
}); 


exports.logout = (req, res) => {
    req.logout();
    req.flash('success', 'Now you are logged out');
    res.redirect('/');
};

exports.isLoggedIn = (req, res, next) => {
    if(req.isAuthenticated()){
        next();
        return;
    }
    req.flash('error', 'You must be logged in to do that!');
    res.redirect('/');
}

exports.forgot = async (req, res) => {
    const user = await User.findOne({email: req.body.email});
    if(!user){
        req.flash('error', 'No account with that email exists');
        return res.redirect('/login');
    }

    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordExpires = Date.now() + 3600000 //1 hour from now
    await user.save();
    const resetURL= `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
    await mail.send({
        user, 
        subject: 'Password Reset',
        resetURL,
        filename: 'password-reset'
    })
    req.flash('success', `You have been emailed a password reset to link. `);
    res.redirect('/login');
}


exports.reset = async (req, res)=> {
    //res.json(req.params);
    const user =  await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user){
        req.flash('error', 'Password reset is invalid or has expired');
        return res.redirect('/login');
    }
    res.render('reset', {title: 'Reset your password'});
}

exports.confirmedPassword = (req, res, next) => {
    if(req.body.password = req.body['password-confirm'] ){
        next();
        return;
    }
    req.flash('error', 'Password do not match! ')
    res.redirect('back');
};

exports.update =  async (req, res) => {
     const user =  await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });
     if (!user){
        req.flash('error', 'Password reset is invalid or has expired');
        return res.redirect('/login');
    }

    const setPassword = promisify(user.setPassword, user);
    await setPassword(req.body.password);
    user.resetPasswordExpires = undefined;
    user.resetPasswordToken = undefined;
    const updatedUser = await user.save();
    await req.login(updatedUser);
    req.flash('success', 'Your password have been reset');
    res.redirect('/');
}