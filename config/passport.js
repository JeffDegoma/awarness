//strategies
const LocalStrategy = require('passport-local').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;


//load usermodel
const User = require('../app/models/user');


//load auth module
const configAuth = require('./auth');

module.exports = (passport) => {

	//passport session
	//required for persistent login sessions
	//passport needs ability to serialize and unserialize users out of session

	//serialize
	passport.serializeUser(function(user, done){
		done(null, user.id);
	});

	//deserialize
	passport.deserializeUser(function(id, done){
		User.findById(id,function(err,user){
			done(err,user);
		});
	});

	//local sign-up=================================
    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, email, password, done){
    	//asychronous
    	//User.findOne won't fire unless data is sent back
    	process.nextTick(function(){
    		//find a user whose email is the same as the forms email
    		//we are checking to see if the user trying to login already exists
    		User.findOne({'local.email': email},function(err, user){
    			if(err)
    				return done(err);
    			if(user){
    				return done(null,false,req.flash('signupMessage', 'That email is already taken.'));
    			}else{
    				const newUser = new User();
    				newUser.local.email = email;
    				console.log(newUser);
                    newUser.local.password = newUser.generateHash(password);

    				newUser.save(function(err){
    					if(err)
    						throw err;
    					return done(null, newUser);
    				});
    			}

    		});
    	});

    }));

    //local-login==================================
    passport.use('local-login', new LocalStrategy({
    	usernameField: 'email',
    	passwordField: 'password',
    	passReqToCallback: true
    },
    function(req, email, password, done){
    	//find a user in the database whose email is the same in the form email
    	User.findOne({'local.email': email}, function(err, user) {
    		if(err)
    			return done(err);
    	   //if user doesn't exist return flash message
    		if(!user)
    			return done(null, false, req.flash('loginMessge', 'No user found'));
    	   //check to see if user is found but the password is wrong
    		if(!user.validPassword(password)){
    			return done(null,false, req.flash('loginMessage', 'Oops! Wrong password.'));
            }
    		return done(null, user);
    	});
  	}));

    //Facebook=========================
    passport.use(new FacebookStrategy({
        // pull in our app id and secret from our auth.js file
        clientID        : configAuth.facebookAuth.clientID,
        clientSecret    : configAuth.facebookAuth.clientSecret,
        callbackURL     : configAuth.facebookAuth.callbackURL
    },
    // facebook will send back the token and profile
    function(token, refreshToken, profile, done) {
        // asynchronous
        process.nextTick(function(){
            // find the user in the database based on their facebook id
            User.findOne({ 'facebook.id' : profile.id }, function(err, user) {
                // if there is an error, stop everything and return that
                // ie an error connecting to the database
                if (err)
                    return done(err);
                // if the user is found, then log them in
                if (user) {
                    return done(null, user); // user found, return that user
                }else{
                    // if there is no user found with that facebook id, create them
                    const newUser            = new User();

                    // set all of the facebook information in our user model
                    newUser.facebook.id    = profile.id; // set the users facebook id                   
                    newUser.facebook.token = token; // we will save the token that facebook provides to the user                    
                    newUser.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName; // look at the passport user profile to see how names are returned
                    // newUser.facebook.email = profile.emails[0].value; // facebook can return multiple emails so we'll take the first

                    // save our user to the database
                    newUser.save(function(err) {
                        if (err)
                            throw err;

                        // if successful, return the new user
                        return done(null, newUser);
                    });
                }
            });
        });
    }));

    //Twitter=========================
    passport.use(new TwitterStrategy({
    	consumerKey     : configAuth.twitterAuth.consumerKey,
        consumerSecret  : configAuth.twitterAuth.consumerSecret,
        callbackURL     : configAuth.twitterAuth.callbackURL
    },
    function(token, tokenSecret, profile, done){
    // make the code asynchronous
    // User.findOne won't fire until we have all our data back from Twitter
    	process.nextTick(function(){ 
    		User.findOne({'twitter.id' : profile.id}, function(err,user){
    			// if there is an error, stop everything and return that
                // ie an error connecting to the database
                if (err)
                    return done(err);
                if(user){
                	return done(null, user);
                }else{
                	const newUser = new User();
                	//set all data we need from schema
                	newUser.twitter.id          = profile.id;
                    newUser.twitter.token       = token;
                    newUser.twitter.username    = profile.username;
                    newUser.twitter.displayName = profile.displayName;

                	newUser.save(function(err){
                		if(err)
                			throw err;

                		return done(null, newUser);
                	});
                }
    		});
    	});

    }));

    //Google=========================
    passport.use(new GoogleStrategy({
     	clientID        : configAuth.googleAuth.clientID,
        clientSecret    : configAuth.googleAuth.clientSecret,
        callbackURL     : configAuth.googleAuth.callbackURL,
    },
    function(token, refreshToken, profile, done){
    		//make asynchronous
    		//User.findOne won't fire until we have all data back from Google
    		process.nextTick(function(){
    			User.findOne({'google.id' : profile.id}, function(err,user){
    				if(err)
    					return done(err);
    				if(user){
    					return done(null,user);
    				}else{
    					const newUser = new User();

	    				newUser.google.id    = profile.id;
	                    newUser.google.token = token;
	                    newUser.google.name  = profile.displayName;
	                    newUser.google.email = profile.emails[0].value; // pull the first email

	                    newUser.save(function(err){
	                    	if(err)
	                    		throw err;

	                    	return done(null, newUser);
	                    });
    				}
    			});
    		});
     }));

};
