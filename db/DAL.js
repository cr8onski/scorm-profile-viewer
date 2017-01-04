var mongoose = require('mongoose');
var debug = require('debug')('scorm-profile-viewer:DAL');
var User = require('./models/user');
var ValRes = require('./models/validationResult');

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
            if (err) return cb(err);
            return cb(null, newuser);
        });
    });
};

DAL.prototype.validatePassword = function(user, password, cb) {
    User.hashPassword(password, user.salt, function (err, pwrdhash, salt) {
        if (err) return cb(err);
        if (pwrdhash !== user.password) return cb(null, false);
        else return cb(null, true);
    });
}

DAL.prototype.validPassword = function(user, password) {
    return user.password === User.hashPassword(password);
};

DAL.prototype.createValidationResult = function (err, stmt, report, schema, cb) {
//    ValRes.createVR(err, report, schema, cb);
    var vr = new ValRes({statement: stmt});
    
    // if no report, message was that no schema matched
    if (err) {
        vr.message = err.message;
        return vr.save(cb);
    }
    else if (report.totalErrors > 0) {
        // results of failed xapi statement
        vr.message = "Failed xAPI Statement validation with " + report.totalErrors + " error(s)";
        vr.jsonschema = undefined;
        for (var idx in report.results[0].errors) {
            var errinfo = report.results[0].errors[idx];
            vr.errorset.push({property: errinfo.trace, message: errinfo.message});
        }
        return vr.save(cb);
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
        return vr.save(cb);
    }
};

module.exports.DAL = new DAL();
