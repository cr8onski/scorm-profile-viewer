var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');
var async = require('async');

var mongoose = require('mongoose');

var debug = require('debug')('scorm-profile-viewer:app');

var app = express();

var config = require('./config');
var passport = require('passport');
var MongoStore = require('connect-mongo')(session);

mongoose.Promise = global.Promise;
mongoose.connect(config.db.url);
var db = mongoose.connection;
var mydal;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
//app.use(cookieParser());
app.use(session({ 
    secret: 'ants ate my sandwich', 
    cookie: { maxAge: 60000},
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({mongooseConnection: mongoose.connection})
}));
//app.use(express.session({secret: 'ants ate my sandwich'}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));


// enable CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept ,X-Experience-API-Version, Authorization");
  next();
});

async.series([
    function doDatabase(cb) {        
        // connect to mongo
        
        db.on('error', console.error.bind(console, 'connection error: '));
        db.once('open', function() {
            mydal = new (require('./db/DAL').DAL)();
            app.set('DAL', mydal);
            cb();
        });
    },
    function setupPassport(cb) {
        passport.serializeUser(function(user, done) {
            debug('serializing user', user);
            done(null, user.id);
        });

        passport.deserializeUser(function(id, done) {
            debug('deserialize user', id);
            mydal.findUserById(id, function(err, user) {
                done(err, user);
            });
        });
        
        cb();
    }],
    function startServer() {
        // routes
        var routes = require('./routes/index');
        var users = require('./routes/users')(app, mydal);
        var statements = require('./routes/statements');
        app.use('/', routes);
        app.use('/users', users);
        app.use('/statements', statements)
        
        
        // catch 404 and forward to error handler
        app.use(function(req, res, next) {
          var err = new Error('Not Found');
          err.status = 404;
          next(err);
        });

        // error handlers

        // development error handler
        // will print stacktrace
        if (app.get('env') === 'development') {
          app.use(function(err, req, res, next) {
            res.status(err.status || 500);
            res.render('error', {
              message: err.message,
              error: err
            });
          });
        }

        // production error handler
        // no stacktraces leaked to user
        app.use(function(err, req, res, next) {
          res.status(err.status || 500);
          res.render('error', {
            message: err.message,
            error: {}
          });
        });
    }
);




module.exports = app;
