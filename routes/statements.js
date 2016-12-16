var express = require('express');
var router = express.Router();
var debug = require('debug')('scorm-profile-viewer:statements');
var validate = require('jsonschema').validate;
var schemas = {
    "http://adlnet.gov/expapi/verbs/initialized": require('../schemas/scorm.profile.initializing.attempt.schema'),
    "http://adlnet.gov/expapi/verbs/terminated": require('../schemas/scorm.profile.terminating.attempt.schema.json'),
    "http://adlnet.gov/expapi/verbs/resumed": require('../schemas/scorm.profile.resuming.attempt.schema.json'),
    "http://adlnet.gov/expapi/verbs/suspended": require('../schemas/scorm.profile.suspending.attempt.schema.json')
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express - Statements endpoint!' });
});

router.post('/', function(req, res, next) {
//    debug(req.body);
    res.setHeader('Content-Type', 'application/json');
    var schema = schemas[req.body.verb.id];
    if (!schema) { 
        res.send({result: "statement didn't match a schema.. unvalidated"});
        return;
    }
    var validatedresponse = validate(req.body, schema);
    if ( validatedresponse.errors.length > 0 ) {
        res.send(JSON.stringify(validatedresponse.errors));
    } else {
        res.send({result: "OK", schema: schema.id});
    }
});

module.exports = router;
