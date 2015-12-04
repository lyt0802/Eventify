var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var userSchema = new mongoose.Schema({
    email: { type: String, required:true , unique:true },
    firstName: {type: String, required: true},
    lastName: {type:String, required: true},
    password: { type: String , required:true},
    hosting: [{type: mongoose.Schema.Types.ObjectId, ref: 'Event'}],
    attending: [{type: mongoose.Schema.Types.ObjectId, ref: 'Event'}],
    attended: [{type: mongoose.Schema.Types.ObjectId, ref: 'Event'}],
    followers: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    following: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    tags: [{type: String}]
});

userSchema.methods.generateHash = function(password){
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

var User = mongoose.model('User', userSchema);

module.exports = User;
