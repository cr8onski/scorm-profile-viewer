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

User.prototype.saveValidationResult = function (err, stmt, report, schema, cb) {
    var vr = this.validationresults.create({statement: stmt});

    // if no report, message was that no schema matched
    if (err) {
        vr.message = err.message;
        this.validationresults.push(vr);
        var doc = this.validationresults[0];
        return cb(null, doc);
    }
    else if (report.totalErrors > 0) {
        // results of failed xapi statement
        vr.message = "Failed xAPI Statement validation with " + report.totalErrors + " error(s)";
        vr.jsonschema = undefined;
        for (var idx in report.results[0].errors) {
            var errinfo = report.results[0].errors[idx];
            vr.errorset.push({property: errinfo.trace, message: errinfo.message});
        }
        this.validationresults.push(vr);
        var doc = this.validationresults[0];
        return cb(null, doc);
    } else {
        // results against schema
        if (report.errors.length > 0) {
            vr.message = "Failed SCORM Profile validation with " +report.errors.length + " error(s)";
            for (var idx in report.errors) {
                var errinfo = report.errors[idx];
                vr.errorset.push({property: errinfo.property.replace("instance", "statement"), message: errinfo.instance + " " + errinfo.message});
            }
            vr.jsonschema.id = schema.id;
            var parts = schema.id.split('/');
            vr.jsonschema.link = "/schemas/" + parts[parts.length - 1] + ".json";
        } else {
            vr.message = "OK";
            vr.success = true;
            vr.jsonschema.id = schema.id;
            var parts = schema.id.split('/');
            vr.jsonschema.link = "/schemas/" + parts[parts.length - 1] + ".json";
        }
        this.validationresults.push(vr);
        var doc = this.validationresults[0];
        return cb(null, doc);
    }
};

module.exports = User;
