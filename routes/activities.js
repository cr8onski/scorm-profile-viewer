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
    router.get('/', function(req, res, next){});

    router.post('/state', testAuth, testForParams(['activityId', 'agent', 'stateId']), function(req, res, next) {
        // TODO: channel info to IO, instead of response
        // TODO: save profiles to db
        const user = req.user;
        const actdoc = req.body;

        const io = req.app.get('socket.io');
        const channel = user.id + "-document-validation-report";
        debug('emitting on channel', channel);

        const stateId = req.query.stateId;
        if (stateId !== "https://w3id.org/xapi/scorm/attempt-state" &&
            stateId !== "https://w3id.org/xapi/scorm/activity-state")
            return res.status(200)
                      .send(`Not Tested -- your stateId ${stateId} didn't match one defined in the xAPI SCORM Profile`);

        const valresult = validate(actdoc, (stateId === "https://w3id.org/xapi/scorm/attempt-state") ?
                                            attemptstateschema : activitystateschema);

        return res.status(200).json(valresult);
        // return res.status(204).send("No Content");
    });

    router.post('/profile', testAuth, testForParams(['activityId', 'profileId']), function(req, res, next) {
        // TODO: channel info to IO, instead of response
        // TODO: save profiles to db
        const user = req.user;
        const actdoc = req.body;

        const io = req.app.get('socket.io');
        const channel = user.id + "-document-validation-report";
        debug('emitting on channel', channel);

        if (req.query.profileId !== "https://w3id.org/xapi/scorm/activity-profile")
            return res.status(200)
                      .send(`Not Tested -- your profileId ${req.query.profileId} didn't match one defined in the xAPI SCORM Profile`);

        const valresult = validate(actdoc, activityprofileschema);

        return res.status(200).json(valresult);
    });

    return router;
};
