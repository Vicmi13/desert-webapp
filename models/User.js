const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
const md5 = require ('md5');
const validator = require ('validator');
const mongoDbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require ('passport-local-mongoose');


const userSchema = new Schema({
    email: {
        type: String,
        lowercase: true,
        unique: true,
        trim: true,
        validate: [validator.isEmail, 'Invalida email password'],
        required: 'Please supply an email address'
    },
    name: {
        type: String,
        required: 'Please supply a name', 
        trim: true
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    hearts: [
        {type: mongoose.Schema.ObjectId, ref: 'Store'}
    ]
});

userSchema.virtual('gravatar').get(function (){
    //return 'https://st2.depositphotos.com/2777531/9900/v/950/depositphotos_99005484-stock-illustration-geek-nerd-cartoon.jpg';
    const hash = md5(this.email);
    return `https://gravatar.com/avatar/${hash}?s=200`;
})

userSchema.plugin(passportLocalMongoose, {usernameField: 'email'} );
userSchema.plugin(mongoDbErrorHandler );

module.exports = mongoose.model('User', userSchema);