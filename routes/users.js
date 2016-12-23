var express = require('express');
var router = express.Router();
var debug = require('debug')('scorm-profile-viewer:users');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;


module.exports = function(the_app, DAL){
//    var User = DAL.User;
    
    passport.use(new LocalStrategy(
        function(username, password, done) {
            DAL.getUser(username, function(err, user) {
                if (err) { 
                    debug('got an error in findOne')
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
    router.get('/', function(req, res, next) {
        debug(req.user);
        res.render('user', {'user':req.user});
    });

    router.get('/login', function(req, res, next) {
        res.render('login', {});
    });

    router.post('/login', 
        passport.authenticate('local', { successRedirect: './',
                                         failureRedirect: './login'
                                       })
    );
    
    return router;
};
