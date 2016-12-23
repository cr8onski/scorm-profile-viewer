var mongoose = require('mongoose');
var debug = require('debug')('scorm-profile-viewer:DAL');
var User = require('./models/user');

function DAL () {}

DAL.prototype.getUser = function(username, cb) {
    User.findOne({username: username}, cb);
};

DAL.prototype.findUserById = function(id, cb) {
    User.findById(id, cb);
};

DAL.prototype.createUser = function(username, password, cb) {
    // do hash, get salt
    User.hashPassword(password, function(err, hashedword, salt) {
        var newuser = new User({username: username, password:hashedword, salt: salt});
        newuser.save(function(err) {
            if (err) cb(err);
            else cb(null, newuser);
        });
    });
};

DAL.prototype.validatePassword = function(user, password, cb) {
    User.hashPassword(password, user.salt, function (err, pwrdhash, salt) {
        if (err) cb(err);
        else if (pwrdhash !== user.password) cb(null, false);
        else cb(null, true);
    });
}

DAL.prototype.validPassword = function(user, password) {
    return user.password === User.hashPassword(password);
};


module.exports.DAL = DAL;
