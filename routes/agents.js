var router = require('express').Router();
var debug = require('debug')('scorm-profile-viewer:agents');
var validate = require('jsonschema').validate;
var testAuth = require('../lib/util').testAuth;
var agentprofileschema = require('../schemas/scorm.profile.agent.profile.schema.json');
var testForParams = require('../lib/util').testForParams;
var VR = require('../db/models/validationResult');


module.exports = function (the_app) {
    router.get('/', testAuth, testForParams(['agent']), function(req, res, next) {
        var agent = req.query.agent && JSON.parse(req.query.agent);
        var person = {objectType: "Person"};
        if (agent.name) person.name = [agent.name];
        if (agent.mbox) person.mbox = [agent.mbox];
        if (agent.mbox_sha1sum) person.mbox_sha1sum = [agent.mbox_sha1sum];
        if (agent.openid) person.openid = [agent.openid];
        if (agent.account) person.account = [agent.account];
        return res.status(200).json(person);
    });

    router.get('/profile', function(req, res, next) {
        return res.status(204).send("No Content");
    });

    router.post('/profile', testAuth, testForParams(['agent', 'profileId']), function(req, res, next) {
        var io = req.app.get('socket.io');
        var user = req.user;

        var profile = req.body;

        var channel = user.id + "-document-validation-report";
        debug('emitting on channel', channel);

        const profileId = req.query.profileId;

        if (profileId !== "https://w3id.org/xapi/scorm/agent-profile")
            return res.status(400)
                      .send(`Not Tested -- your profileId ${profileId} didn't match one defined in the xAPI SCORM Profile`);

        var valresult = validate(profile, agentprofileschema);

        user.saveValidationResult(
            VR.normalize(null,profile, profileId.slice(profileId.lastIndexOf('/') +1),
                valresult, agentprofileschema),
                function (err, validationResult){
                    io.emit(channel, validationResult);
                    return res.status(204).send("No Content");
        });
    });
    return router;
};
