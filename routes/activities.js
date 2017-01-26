var router = require('express').Router();
var debug = require('debug')('scorm-profile-viewer:activities');
var validate = require('jsonschema').validate;


module.exports = function (the_app) {
    router.get('/', fu)
};
