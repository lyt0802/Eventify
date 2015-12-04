var User = require('../models/user');
var Event = require('../models/event')
var mongoose = require('mongoose')

module.exports = function(app){
  app.post('/login', app.passport.authenticate("local-login", {
    successRedirect: '/profile',
    failureRedirect: '/'
  }));

  app.post('/signup', app.passport.authenticate("local-signup", {
    successRedirect: '/profile',
    failureRedirect: '/'
  }));

  app.get('/logout', function(req, res) {
      req.logout();
      res.redirect('/');
  });

  app.get('/profile', app.common.isLoggedIn, function(req,res){
      //console.log(req.user);
      User.findById(req.user._id)
          .select('email firstName lastName hosting attending')
          .exec(function(err, user) {
              res.render('profile.jade', {user: user});
      });
  });

  app.get('/events', app.common.isLoggedIn, function(req,res){
    Event.find({ _id: {$nin: req.user.attending.concat(req.user.hosting)}})
         .populate('host', 'firstName lastName')
         .exec(function(err,events){
           if(err) console.log(err);
           else {
             //console.log(events)
             //console.log(req.user)
             res.render('events.jade', {events: events, user: req.user})
           }
         })
  });

  app.get('/event_chat_room/:id', app.common.isLoggedIn, function(req,res){
    console.log(req.user)
    Event.findById(req.params.id)
         .select('title location host attenders')
         .populate('host attenders', 'firstName lastName')
         .exec(function(err, event){
           res.render('event_chat_room.jade', {event: event, user: req.user})
         })
  })

  app.get('/event/:id', app.common.isLoggedIn, function(req,res){
    //console.log('@jade', req.params.id)
    console.log(req.user)
    Event.findById(req.params.id)
         .select('title location host attenders')
         .populate('host attenders', 'firstName lastName')
         .exec(function(err, event){
           //console.log('@ERR', err)
           //console.log('@EVENT', event);
           res.render('event.jade', {event: event, user:req.user})
         });
  });

  //TODO: CONSIDER CHANGING THIS INTO AJAX REQUEST
  app.post('/attend', app.common.isLoggedIn, function(req,res){
    console.log(req.body._id)
    console.log(req.user._id)
    Event.findById(req.body._id)
         .exec(function(err,event){
           if(err) console.log(err);
           else{
             req.user.attending.push(event._id)
             req.user.save(function(err){
               if(err) console.log(err);
               else {
                 event.attenders.push(mongoose.Types.ObjectId(req.user._id));
                 event.save(function(err){
                   if(err) console.log(err);
                   else{
                     res.redirect('/events');
                   }
                 })
               }
             })
           }
         })
  });

  app.post('/unattend', app.common.isLoggedIn, function(req,res){
    console.log('unattend')
    Event
      .findById(req.body.un_id)
      .exec(function(err,event) {
        if(err) console.log(err)
        else{
          req.user.update({ $pull: {"attending": { "$in": [mongoose.Types.ObjectId(req.body.un_id)]}} }, function(err,obj){
            //console.log(err)
            //console.log(obj)
            if (err) {
              console.log(err)
            } else {
              event.update({ $pull: {"attenders": { "$in": [mongoose.Types.ObjectId(req.user.id)]}}} ,function(err,obj){
                console.log(err)
                console.log(obj)
                if (err) console.log(err);
                else{
                  res.redirect('/events');
                }
            })
          }
        })
      }
  })
});

  app.get('/create_new_event', app.common.isLoggedIn, function(req,res){
    User.findById(req.user._id)
        .select('hosting firstName lastName email')
        .populate('hosting')
        .exec(function(err,user){
          res.render('create_or_edit_event.jade', {event:null});//, {user: user});
        });
  });

  app.get('/attending', app.common.isLoggedIn, function(req,res){
    //console.log(req.user._id)
    User.findById(req.user._id)
         .select('attending firstName lastName email')
         .populate('attending', 'title location')
         .exec(function(err,user){
           res.render('attending.jade', {user: user});
   });
  });

  app.get('/hosting', app.common.isLoggedIn, function(req,res){
    User.findById(req.user._id)
         .select('hosting firstName lastName email')
         .populate('hosting', 'title location')
         .exec(function(err,user){
           res.render('hosting.jade', {user: user});
         });
  });

  app.post('/create_event', app.common.isLoggedIn, function(req,res){
    //console.log(req.body)
    var newEvent = new Event({
      title: req.body.title,
      location: req.body.location,
      host: req.user,
      attenders: [req.user._id]
    });
    newEvent.save(function(err){
      if(err) console.log(err);
      else{
        //TODO: save to user hosting.
        //console.log(req.user.hosting)
        req.user.hosting.push(newEvent._id);
        req.user.attending.push(newEvent._id);
        req.user.save(function(err){
          if(err) console.log(err);
          else {
                res.redirect('/events');
              }
            })
          }
        })
    });

  app.post('/edit_event', app.common.isLoggedIn,function(req,res){
    Event.findById(req.body.edit_id)
         .exec(function(err, event){
           if(err)console.log(err)
           else{
             res.render('create_or_edit_event.jade', {event: event});
           }
         })
  })

  app.post('/edit_event_final', app.common.isLoggedIn, function(req,res){
    Event.findById(req.body.edit_id)
         .exec(function(err,event){
           if(err)console.log(err)
           else{
             event.title = req.body.title
             event.location = req.body.location
             event.save(function(err){
               if(err)console.log(err)
               else{
                 res.redirect('/event/'+req.body.edit_id)
               }
             })
           }
         })
  });

  app.post('/delete_event', app.common.isLoggedIn, function(req,res){
    Event.findById(req.body.del_id)
         .exec(function(err,event){
           if(err)console.log(err);
           else{
             User.update({}, {$pull: {"attending": {"$in": [mongoose.Types.ObjectId(req.body.del_id)]}}},{multi:true},function(err,obj){
               if(err)console.log(err)
               else{
                 User.update({}, {$pull:{"hosting":{"$in": [mongoose.Types.ObjectId(req.body.del_id)]}}},{multi:true},function(err,obj){
                   //console.log(err)
                   //console.log(obj)
                   if(err)console.log(err)
                   else{
                     Event.remove({_id: event._id}, function(err,obj){
                      //console.log(err)
                      //console.log(obj)
                      if(err) console.log(err)
                      else{
                        res.redirect('/events');
                 }
                 });
               }
             })
           }
         })
       }
       })
     })

  /*
  Chatting stuff.
  */
  
};
