module.exports = function(app){
    app.common =  {
        isLoggedIn: function(req, res, next) {
            if (req.isAuthenticated()) {
                next();
            } else {
                res.redirect('/');
            }
        },

        isActive: function(req, res, next) {
            if (req.isAuthenticated()) {
                next();
            } else {
                res.redirect('/profile');
            }
        },

        isNotLoggedIn: function(req, res, next) {
            if (!req.isAuthenticated()) {
               next();
            } else {
                //res.redirect('/profile');
                res.send('/events');
            }
        }
    };
};
