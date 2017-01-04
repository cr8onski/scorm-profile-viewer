var router = require('express').Router();
var debug = require('debug')('scorm-profile-viewer:users');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mustBeLoggedIn = require('../lib/util').mustBeLoggedIn;

var DAL = require('../db/DAL').DAL;


module.exports = function(the_app){
    
    passport.use(new LocalStrategy(
        function(username, password, done) {
            DAL.getUser(username, function(err, user) {
                if (err) { 
                    debug('got an error in DAL getUser')
                    return done(err); 
                }
                if (!user) {
                    DAL.createUser(username, password, function (err, newuser) {
                        if (err) { 
                            debug('got an error in save newuser')
                            return done(null, false, {message: 'Did not find an existing user by that name and could not create a new user'});
                        }
                        debug('success in save newuser')
                        return done(null, newuser);
                    });
                }
                else {
                    DAL.validatePassword(user, password, function(err, valid) {
                        if (err || !valid) {
                            debug('invalid password on existing user')
                            return done(null, false, { message: 'Incorrect password.' });
                        }
                        else {
                            debug('valid password on existing user -- all good')
                            return done(null, user);
                        }
                    });
                }
            });
        }
    ));

    /* GET users listing. */
    router.get('/', mustBeLoggedIn, function(req, res, next) {
        return res.render('user', {'user':req.user});
    });

    router.get('/login', function(req, res, next) {
        debug("in get login .. r: ", req.query.r);
        return res.render('login', {r: req.query.r});
    });

    router.post('/login', 
        passport.authenticate('local'),
        function(req, res, next) {
            //look for param r
            if (req.query.r) return res.redirect(decodeURIComponent(req.query.r));
            else return res.redirect('./')
            // otherwise redirect to /
        }
    );
    
    router.get('/logout', function(req, res, next) {
        if(req.user) req.logout();
        
        return res.redirect('/');
    });
    
    return router;
};
