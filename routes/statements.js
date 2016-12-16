var express = require('express');
var router = express.Router();
var debug = require('debug')('scorm-profile-viewer:statements');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express - Statements endpoint!' });
});

router.post('/', function(req, res, next) {
    debug(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify([req.body.id || 'nooooope']));
});

module.exports = router;
