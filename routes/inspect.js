var router = require('express').Router();
var debug = require('debug')('scorm-profile-viewer:inspect');
var mustBeLoggedIn = require('../lib/util').mustBeLoggedIn;

module.exports = function(the_app) {
    router.get('/:streamid/statements', mustBeLoggedIn, function(req, res, next) {
        return res.render('statements', { title: 'Express - Statements endpoint!', streamid: req.params.streamid });
    });

    router.get('/:streamid/documents', mustBeLoggedIn, function(req, res, next) {
        return res.render('documents', { title: 'Express - Documents endpoint!', streamid: req.params.streamid });
    });


    return router;
};
