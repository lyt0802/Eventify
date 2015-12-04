var passport = require('passport');
var localStrategy = require('passport-local').Strategy;

var User = require('../models/user');

passport.serializeUser(function(User, done) {
    done(null, User.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, User) {
        done(err, User);
    });
});

passport.use('local-signup', new localStrategy({usernameField: 'email', passwordField: 'password', passReqToCallback: true},
    function(req, email, password, done) {
        process.nextTick(function() {
            User.findOne({'email': email}, function(err, Userb) {
                if (err) return done(err);
                if (Userb) {
                    console.log("HERE");
                    return done(null, false, req.flash('userexists', 'The email you entered has an asssociated account'));
                } else {
                    var newUser = new User();
                    newUser.firstName = req.body.firstName;
                    newUser.lastName = req.body.lastName;
                    newUser.email = email;
                    newUser.password = newUser.generateHash(password);
                    if (password === req.body.confirmationPassword) {
                        newUser.save(function(err) {
                            if (err) throw err;
                            else {
                                return done(null, newUser);
                            }
                        });
                    } else {
                        return done(null, false, req.flash('passwordmismatch', 'The passwords you entered did not match'));
                    }
                }
            });
        });
    }
));

passport.use('local-login', new localStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
    }, function(req, email, password, done) {
        User.findOne({'email' : email }, function(err, user) {
            if (err) return done(err);
            //User does not exist
            else if (!user) return done(null, false, req.flash('inexistentEmail', 'The user does not exist'));
            //Wrong password
            else if (!user.validPassword(password)) return done(null, false, req.flash('wrongPassword', 'The password you entered is incorrect'));
            //Life is great
            else return done(null, user);
        });
    }
));

module.exports = function(app) {
    app.passport = passport;
    app.use(passport.initialize());
    app.use(passport.session());
};
