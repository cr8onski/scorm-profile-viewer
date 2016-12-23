var router = require('express').Router();

var debug = require('debug')('scorm-profile-viewer:statements');

var uuid = require('node-uuid');

var validate = require('jsonschema').validate;
var stmtvalidator = require('../lib/stmtvalidator').Validator;
var validateStatement = (new stmtvalidator()).validateStatement;

var schemas = {
    "http://adlnet.gov/expapi/verbs/initialized": require('../schemas/scorm.profile.initializing.attempt.schema'),
    "http://adlnet.gov/expapi/verbs/terminated": require('../schemas/scorm.profile.terminating.attempt.schema.json'),
    "http://adlnet.gov/expapi/verbs/resumed": require('../schemas/scorm.profile.resuming.attempt.schema.json'),
    "http://adlnet.gov/expapi/verbs/suspended": require('../schemas/scorm.profile.suspending.attempt.schema.json')
};


/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('statements', { title: 'Express - Statements endpoint!' });
});

router.post('/', function(req, res, next) {
    var io = req.app.get('socket.io');
    
    var stmt = req.body;
    
    var schema = schemas[stmt.verb.id];
    if (!schema) { 
        var msg = {result: "statement didn't match a schema.. unvalidated"};
        io.emit('validation-report', msg);
        res.status(400).send("Bad Request - " + msg.result);
        return;
    }
    
    var report = validateStatement(stmt);
    if (report.totalErrors > 0) {
        io.emit('validation-report', report.results);
        res.status(400).send("Bad Request = " + JSON.stringify(report.results));
        return;
    }

    var validatedresponse = validate(req.body, schema);
    if ( validatedresponse.errors.length > 0 ) {
        io.emit('validation-report', validatedresponse.errors);
        res.status(400).send("Bad Request - " + JSON.stringify(validatedresponse.errors));
    } else {
        var msg = {result: "OK", schema: schema.id};
        io.emit('validation-report', msg);
        res.status(200).json([req.body.id || uuid.v4()]);
    }
    
});

module.exports = router;
