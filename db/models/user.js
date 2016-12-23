'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const crypto = require('crypto');

var UserSchema = new Schema(require('../mongooseSchemas/user'));

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

module.exports = User;
