var DAL = require('../db/DAL').DAL;
var debug = require('debug')('scorm-profile-viewer:util');

module.exports = {
    mustBeLoggedIn: function(req, res, next) {
        if (req.user) return next();
        else res.redirect('/users/login?r=' + encodeURIComponent(req.originalUrl));
    },
    testAuth: function (req, res, next) {
        var auth = req.get("authorization");

        if (!auth) {
            res.set("WWW-Authenticate", "Basic realm=\"Authorization Required\"");
            return res.status(401).send("Authorization Required");
        } else {
            var credentials = new Buffer(auth.split(" ").pop(), "base64").toString("ascii").split(":");
            var username = credentials[0],
                password = credentials[1];

            DAL.getUser(username, function (err, user) {
                debug(username, user)
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
                        return next();
                    }
                });
            });
        }
    },
    testForParams: function (params) {
        return function (req, res, next) {
            params.forEach((param) => {
                if (!req.query[param]) return res.status(400).send(`Bad Request - missing ${param} param`);
            });
            return next();
        };
    }
}
