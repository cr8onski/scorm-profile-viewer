var router = require('express').Router();

var debug = require('debug')('scorm-profile-viewer:statements');

var uuid = require('node-uuid');

var validate = require('jsonschema').validate;
var stmtvalidator = require('../lib/stmtvalidator').Validator;
var validateStatement = (new stmtvalidator()).validateStatement;

var mustBeLoggedIn = require('../lib/util').mustBeLoggedIn;

var schemas = {
    "http://adlnet.gov/expapi/verbs/initialized": require('../schemas/scorm.profile.initializing.attempt.schema'),
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

        var channel = req.user.id + "-validation-report";
        debug('emitting on channel', channel);

        var stmt = req.body;

        var schema = schemas[stmt.verb.id];
        if (!schema) {
            var msg = {
                result: "statement didn't match a schema.. unvalidated"
            };
            io.emit(channel, msg);
            res.status(400).send("Bad Request - " + msg.result);
            return;
        }

        var report = validateStatement(stmt);
        if (report.totalErrors > 0) {
            io.emit(channel, report.results);
            res.status(400).send("Bad Request = " + JSON.stringify(report.results));
            return;
        }

        var validatedresponse = validate(req.body, schema);
        if (validatedresponse.errors.length > 0) {
            io.emit(channel, validatedresponse.errors);
            res.status(400).send("Bad Request - " + JSON.stringify(validatedresponse.errors));
        } else {
            var msg = {
                result: "OK",
                schema: schema.id
            };
            io.emit(channel, msg);
            res.status(200).json([req.body.id || uuid.v4()]);
        }

    });
    return router;
}