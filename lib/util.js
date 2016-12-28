module.exports.mustBeLoggedIn = function(req, res, next) {
    if (req.user) next();
    else res.redirect('/users/login?r=' + encodeURIComponent(req.originalUrl));
};