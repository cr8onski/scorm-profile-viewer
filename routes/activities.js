var router = require('express').Router();
var debug = require('debug')('scorm-profile-viewer:activities');
var validate = require('jsonschema').validate;
var testAuth = require('../lib/util').testAuth;
var testForParams = require('../lib/util').testForParams;
var activitystateschema = require('../schemas/scorm.profile.activity.state.schema.json');
var attemptstateschema = require('../schemas/scorm.profile.attempt.state.schema.json');
var activityprofileschema = require('../schemas/scorm.profile.activity.profile.schema.json');

// state: activityid, agent, stateid for POST and single GET, activityid, agent for multi GET
// profile: activityid
module.exports = function (the_app) {
    router.get('/', testAuth, testForParams(['activityId']), function(req, res, next){
        return res.status(200).json({"objectType":"Activity", "id":req.query.activityId});
    });

    router.post('/state', testAuth, testForParams(['activityId', 'agent', 'stateId']), function(req, res, next) {
        const user = req.user;
        const actdoc = req.body;

        const io = req.app.get('socket.io');
        const channel = user.id + "-document-validation-report";
        debug('emitting on channel', channel);

        const stateId = req.query.stateId;
        if (stateId !== "https://w3id.org/xapi/scorm/attempt-state" &&
            stateId !== "https://w3id.org/xapi/scorm/activity-state")
            return res.status(400)
                      .send(`Not Tested -- your stateId ${stateId} didn't match one defined in the xAPI SCORM Profile`);

        var curschema = (stateId === "https://w3id.org/xapi/scorm/attempt-state") ?
                                            attemptstateschema : activitystateschema;

        const valresult = validate(actdoc, curschema);

        user.saveValidationResult(null,
            actdoc, stateId.slice(stateId.lastIndexOf('/') +1),
            valresult, curschema,
            function (err, validationResult){
                io.emit(channel, validationResult);
                return res.status(204).send("No Content");
        });
    });

    router.post('/profile', testAuth, testForParams(['activityId', 'profileId']), function(req, res, next) {
        const user = req.user;
        const actdoc = req.body;

        const io = req.app.get('socket.io');
        const channel = user.id + "-document-validation-report";
        debug('emitting on channel', channel);

        const profileId = req.query.profileId;
        if (profileId !== "https://w3id.org/xapi/scorm/activity-profile")
            return res.status(400)
                      .send(`Not Tested -- your profileId ${profileId} didn't match one defined in the xAPI SCORM Profile`);

        const valresult = validate(actdoc, activityprofileschema);

        user.saveValidationResult(null,
            actdoc, profileId.slice(profileId.lastIndexOf('/') +1),
            valresult, activityprofileschema,
            function (err, validationResult){
                io.emit(channel, validationResult);
                return res.status(204).send("No Content");
        });
    });

    return router;
};
