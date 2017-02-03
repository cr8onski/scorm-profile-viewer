'use strict';

var debug = require('debug')('scorm-profile-viewer:user');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const crypto = require('crypto');

var VRSchema = require('./validationResult').schema;

var UserSchema = new Schema({
    username: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true,
        required: true,
        validate: [require('validator').isEmail, 'invalid username, must be email']
    },
    password: String,
    salt: String,
    validationresults: [VRSchema]
});


const LEN = 256;
const SALT_LEN = 64;
const ITERATIONS = 10000;
const DIGEST = 'sha256';

var dohash = function(password, salt, iterations, len, digest, cb) {
    crypto.pbkdf2(password, salt, iterations, len, digest, function(err, pwrdhash) {
        if (err) {
            return cb(err);
        }
        return cb(null, pwrdhash.toString('hex'), salt);
    });
}

UserSchema.statics.hashPassword = function(password, salt, cb) {
    var len = LEN/2;

    if (3 === arguments.length) {
        // existing password and salt
        dohash(password, salt, ITERATIONS, len, DIGEST, cb);
    } else {
        // no salt, create and hash password
        cb = salt;
        crypto.randomBytes(SALT_LEN / 2, function(err, salt) {
            if (err) {
                return cb(err);
            }

            salt = salt.toString('hex');
            dohash(password, salt, ITERATIONS, len, DIGEST, cb);
        });
    }
};


var User = mongoose.model('User', UserSchema);

User.prototype.saveValidationResult = function (vr, cb) {
    this.validationresults.push(vr);
    this.save(function(err, thisuser) {
        if (err) return cb(err);
        var doc = thisuser.validationresults[thisuser.validationresults.length-1];
        return cb(null, doc);
    });
};

module.exports = User;
