var router = require('express').Router();

var debug = require('debug')('scorm-profile-viewer:statements');

var uuid = require('node-uuid');

var validate = require('jsonschema').validate;
var stmtvalidator = require('../lib/stmtvalidator').Validator;
var validateStatement = (new stmtvalidator()).validateStatement;

var mustBeLoggedIn = require('../lib/util').mustBeLoggedIn;

var schemas = {
    "http://adlnet.gov/expapi/verbs/initialized": require('../schemas/scorm.profile.initializing.attempt.schema.json'),
    "http://adlnet.gov/expapi/verbs/terminated": require('../schemas/scorm.profile.terminating.attempt.schema.json'),
    "http://adlnet.gov/expapi/verbs/resumed": require('../schemas/scorm.profile.resuming.attempt.schema.json'),
    "http://adlnet.gov/expapi/verbs/suspended": require('../schemas/scorm.profile.suspending.attempt.schema.json')
};

module.exports = function (the_app, DAL) {

    var testAuth = function (req, res, next) {
        var auth = req.get("authorization");

        if (!auth) {
            res.set("WWW-Authenticate", "Basic realm=\"Authorization Required\"");
            return res.status(401).send("Authorization Required");
        } else {
            var credentials = new Buffer(auth.split(" ").pop(), "base64").toString("ascii").split(":");
            var username = credentials[0],
                password = credentials[1];

            DAL.getUser(username, function (err, user) {
                if (err || !user) {
                    debug('got error in auth verification - getUser');
                    return res.status(403).send("Access Denied (incorrect credentials)");
                }

                DAL.validatePassword(user, password, function (err, valid) {
                    if (err || !valid) {
                        debug('invalid password on existing user');
                        return res.status(403).send("Access Denied (incorrect credentials)");
                    } else {
                        debug('valid password on existing user -- all good')
                        req.user = user;
                        next();
                    }
                });
            });
        }
    };

    /* GET home page. */
    router.get('/', function (req, res, next) {
        res.append('X-Experience-API-Consistent-Through', (new Date('1 January 1971 00:00 UTC')).toISOString());
        res.status(200).json([]);
    });

    router.post('/', testAuth, function (req, res, next) {
        var io = req.app.get('socket.io');
        
        var stmt = req.body;
        stmt.id = stmt.id || uuid.v4();
        
        var validationResult = {
            success: false,
            message: "",
            schema: {
                id: "",
                link: ""
            },
            errors: [],
            statement: stmt
        };
        // errors obj {property:String, message:String}

        var channel = req.user.id + "-validation-report";
        debug('emitting on channel', channel);
        
        // validate statement
        var report = validateStatement(stmt);
        if (report.totalErrors > 0) {
            validationResult.message = "Failed xAPI Statement validation with " + report.totalErrors + " error(s)";
            
            var reportresults = report.results[0];
            for (var idx in reportresults.errors) {
                var errinfo = reportresults.errors[idx];
                validationResult.errors.push({property: errinfo.trace, message: errinfo.message});
            }
            validationResult.schema = undefined;
            io.emit(channel, validationResult);
            res.status(400).send("Bad Request - " + validationResult.message);
            return;
        }
        
        // find schema
        var schema = schemas[stmt.verb.id];
        if (!schema) {
            validationResult.message = "Statement didn't match a schema.. unvalidated";
            io.emit(channel, validationResult);
            res.status(400).send("Bad Request - " + validationResult.message);
            return;
        }

        // validate against schema
        var validatedresponse = validate(req.body, schema);
        if (validatedresponse.errors.length > 0) {
            validationResult.message = "Failed SCORM Profile validation with " +validatedresponse.errors.length + " error(s)";
            for (var idx in validatedresponse.errors) {
                var errinfo = validatedresponse.errors[idx];
                validationResult.errors.push({property: errinfo.property, message: errinfo.instance + " " + errinfo.message});
            }
            validationResult.schema.id = schema.id;
            var parts = schema.id.split('/');
            validationResult.schema.link = "/schemas/" + parts[parts.length - 1] + ".json";
            
            io.emit(channel, validationResult);
            res.status(400).send("Bad Request - " + validationResult.message);
        } else {
            validationResult.message = "OK";
            validationResult.success = true;
            validationResult.schema.id = schema.id;
            var parts = schema.id.split('/');
            validationResult.schema.link = "/schemas/" + parts[parts.length - 1] + ".json";
            io.emit(channel, validationResult);
            res.status(200).json([validationResult.statement.id]);
        }

    });
    return router;
}