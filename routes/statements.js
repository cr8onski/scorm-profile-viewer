var router = require('express').Router();

var debug = require('debug')('scorm-profile-viewer:statements');

var uuid = require('node-uuid');

var DAL = require('../db/DAL').DAL;
var testAuth = require('../lib/util').testAuth;

var validate = require('jsonschema').validate;
var stmtvalidator = require('../lib/stmtvalidator').Validator;
var validateStatement = (new stmtvalidator()).validateStatement;
var VR = require('../db/models/validationResult');

var schemas = {
    "http://adlnet.gov/expapi/verbs/initialized": require('../schemas/scorm.profile.initializing.attempt.schema.json'),
    "http://adlnet.gov/expapi/verbs/terminated": require('../schemas/scorm.profile.terminating.attempt.schema.json'),
    "http://adlnet.gov/expapi/verbs/resumed": require('../schemas/scorm.profile.resuming.attempt.schema.json'),
    "http://adlnet.gov/expapi/verbs/suspended": require('../schemas/scorm.profile.suspending.attempt.schema.json')
};

module.exports = function (the_app) {
    /* GET home page. */
    router.get('/', function (req, res, next) {
        res.append('X-Experience-API-Consistent-Through', (new Date('1 January 1971 00:00 UTC')).toISOString());
        return res.status(200).json([]);
    });

    router.post('/', testAuth, function (req, res, next) {
        var io = req.app.get('socket.io');
        var user = req.user;

        var stmt = req.body;
        stmt.id = stmt.id || uuid.v4();

        var channel = user.id + "-statement-validation-report";
        debug('emitting on channel', channel);

        // validate statement
        var report = validateStatement(stmt);
        if (report.totalErrors > 0) {
            user.saveValidationResult(VR.normalize(null, stmt, 'statement', report, null), function(err, validationResult) {
                io.emit(channel, validationResult);
                return res.status(400).send("Bad Request - " + validationResult.message);
            });
            return;
        }

        // find schema
        var schema = schemas[stmt.verb.id];
        if (!schema) {
            user.saveValidationResult(VR.normalize(new Error("Statement didn't match a schema.. unvalidated"), stmt, 'statement', null, null), function(err, validationResult) {
                io.emit(channel, validationResult);
                return res.status(400).send("Bad Request - " + validationResult.message);
            });
            return;
        }

        // validate against schema
        var validatedresponse = validate(req.body, schema);
        if (validatedresponse.errors.length > 0) {
            user.saveValidationResult(VR.normalize(null, stmt, 'statement', validatedresponse, schema), function (err, validationResult) {
                io.emit(channel, validationResult);
                return res.status(400).send("Bad Request - " + validationResult.message);
            });
        } else {
            user.saveValidationResult(VR.normalize(null, stmt, 'statement', validatedresponse, schema), function (err, validationResult){
                io.emit(channel, validationResult);
                return res.status(200).json([validationResult.document.id]);
            })
        }

    });
    return router;
}
