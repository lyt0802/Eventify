var express = require('express');
var app = express(); //application as an instance of express
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io')(server);
var User = require('./models/user');
var Event = require('./models/event');
//var Tag = require('./models/tag');
var mongoose = require('mongoose');

//Application Configuration
require('./config/app')(app);
//database configuration
require('./config/database');
require('./config/authentication')(app);
require('./common')(app);

app.set('views', process.cwd() + '/views');
app.use(express.static(__dirname + '/public'));
app.get('/', app.common.isNotLoggedIn, function(req,res){
    res.render('index.jade', {
        userexists: req.flash('userexists'),
        inexistentEmail: req.flash('inexistentEmail'),
        wrongPassword: req.flash('wrongPassword'),
        passwordmismatch: req.flash('passwordmismatch'),
        verified: req.flash('verified')
    });
});

//require('./routes/session')(app);

var rooms_list = []
/*
remove array element by value
var index = array.indexOf(item);
array.splice(index, 1);
*/

//Routing ------------------------------------------------------


app.post('/login', app.passport.authenticate("local-login", {
  successRedirect: '/events/',
  failureRedirect: '/'
}));

app.post('/signup', app.passport.authenticate("local-signup", {
  successRedirect: '/events',
  failureRedirect: '/'
}));

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

app.post('/search/', app.common.isLoggedIn, function(req, res) {
    console.log(req.body.search[0].value);
    if (req.body.search[0].value === '') {
        User.find({ _id: { $nin: [req.user._id] } })
            //.select('email')
            .exec(function(err, users) {
                if (err) console.log(err);
                else res.send({ users: users });
            });
    } else {
        var search = req.body.search[0].value
        console.log(search);
        User.find({
            $or: [
                {'firstName': new RegExp('[a-zA-Z]*' + search + '[a-zA-Z]*') },
                {'lastName': new RegExp('[a-zA-Z]*' + search + '[a-zA-Z]*')},
                {'email': new RegExp('\w*' + search + '\w*')}
            ]
        })
        //.populate()
        .exec(function(err, users) {
            console.log(users);
            if (err) console.log(err);
            else {
              res.send({users: users});
            }
        });
    }
  });
/*
------------------------Profile Related Stuff --------------------------------------
*/
app.get('/profile', app.common.isLoggedIn, function(req,res){
    //console.log(req.user);
    User.findById(req.user._id)
        .select('email firstName lastName hosting attending attended followers following tags')
        //.populate('hosting attending attended')
        .exec(function(err, user) {
            res.render('profile.jade', {user: user, other_user: 0});
    });
});

app.get('/profile/:id', app.common.isLoggedIn, function(req, res){
  User.findById(req.params.id)
      .select('firstName lastName hosting attending attended email followers following tags')
      .populate('followers')
      .exec(function(err, user){
        var in_followers_list = false;
        //Check to see if you are a follower of the page.
        for(var i = 0 ; i < user.followers.length; i++){
          console.log(String(req.user._id));
          console.log(String(user.followers[i]._id));
          if(String(req.user._id) == String(user.followers[i]._id)){
            console.log("in followers list");
            in_followers_list = true;
          }
        }
        //not same user and not a follower
        if(String(user._id) != String(req.user._id) && in_followers_list == false){
          console.log("not same user and not a follower");
          res.render('profile.jade', { this_user: req.user, user: user, other_user: 1, follower: false});
        } else if(String(user._id) != String(req.user._id) && in_followers_list == true){ //not same user but a follower
          console.log("not same user but follower")
          res.render('profile.jade', { this_user: req.user, user: user, other_user: 1, follower: true});
        } else { // your own profile.
          console.log("own profile")
          res.render('profile.jade', { this_user: req.user, user: user, other_user: 0});
        }
      })
})

/*
Edit Profile
*/
app.get('/edit_profile', app.common.isLoggedIn,function(req,res){
  User.findById(req.user._id)
   .exec(function(err, user){
     if(err)console.log(err)
     else{
       res.render('edit_profile.jade', {user: user});
     }
   })
})

/*
Save Edited profile
*/
app.post('/save_edit_profile', app.common.isLoggedIn, function(req,res){
  User.findById(req.body.user_id)
    .exec(function(err,user){
    if(err)console.log(err)
    else{
      var split_tags = req.body.tags.split(',')
        console.log("split_tags------------------------ " + split_tags);
        for (var i = 0; i < split_tags.length; i++){
          //check if it is in Event tags list.
          var index = user.tags.indexOf(split_tags[i])
          if(index == -1){ //tag doesnt exist
            user.tags.push(split_tags[i])
          } else {
            //do nothing
          }
        }
        user.firstName = req.body.first_name
        user.lastName = req.body.last_name
        user.save(function(err,user){
        if(err)console.log(err)
        else{
        res.redirect('/profile/'+req.user._id);//res.render('profile.jade', { this_user: req.user, user: user, other_user: 0});
        }
      })
    }
  })
});

app.get('/attending/:id', app.common.isLoggedIn, function(req,res){
  //console.log(req.user._id)
  User.findById(req.params.id)
       .select('attending firstName lastName email')
       .populate('attending', 'title location')
       .exec(function(err,user){
         res.render('attending.jade', {user: user});
 });
});

app.get('/hosting/:id', app.common.isLoggedIn, function(req,res){
  User.findById(req.params.id)
       .select('hosting firstName lastName email')
       .populate('hosting', 'title location')
       .exec(function(err,user){
         res.render('hosting.jade', {user: user});
       });
});

app.get('/followers/:id', app.common.isLoggedIn, function(req,res){
    User.findById(req.params.id)
        .select('followers email')
        .populate('followers', 'email firstName lastName profilePicture')
        .exec(function(err,user){
            res.render('followers.jade', {this_user: req.user, user: user});
        });
});
    
    
app.get('/following/:id', app.common.isLoggedIn, function(req,res){
    User.findById(req.params.id)
        .select('following email')
        .populate('following', 'email firstName lastName profilePicture')
        .exec(function(err,user){
            res.render('following.jade', {this_user: req.user, user: user});
        });
});
    
app.post('/follow', app.common.isLoggedIn, function(req,res){
     console.log(req.body.id);
     console.log(req.user.following);
     if(req.user.following.indexOf(req.body.id) == -1) {
        req.user.following.push(req.body.id);
        req.user.save(function(err){
            if(err) console.log(err);
            else {
                User.findById(req.body.id)
                    .exec(function(err,user){
                        if(err) console.log(err);
                        else {
                            user.followers.push(req.user._id);
                            user.save(function(err){
                                if(err) console.log(err);
                                else res.redirect('/profile/'+req.user._id)//res.render('profile.jade', { this_user: req.user, user: req.user, other_user: 0});
                            });
                        }
                    });
            }
        });
    }
});
/*
------------------------Event Related Stuff --------------------------------------
*/
app.get('/events', app.common.isLoggedIn, function(req,res){
  Event.find({ _id: {$nin: req.user.attending.concat(req.user.hosting)}})
       .populate('host attenders', 'firstName lastName')
       .exec(function(err,events){
         if(err) console.log(err);
         else {
           retval = calculateInterestedEvents(events, req.user);
           //console.log(events)f
           //console.log(req.user)
           res.render('events.jade', {events: retval, user: req.user})
         }
       })
});

function calculateInterestedEvents(events, user){
  console.log(events);
  console.log(user);
  //search if following follower are attending event and sort by number of following 
  //and follower(that is not following) attending.
  var attending_num_list = calculateFollowingFollower(events, user);
  
  //calculate number of similar tags between you and each event and sort by number.
  var event_compatibility = calculateEventCompatibility(events, user);
  
  //calculate the time between now and the event and sort by time.
  var time_to_events = calculateEventTimeFromNow(events);
  
  var results = determine_final(events, attending_num_list, event_compatibility, time_to_events)
  
  return results
  
}

function determine_final(events, attending_num_list, event_compatibility, time_to_events){
 
  var final_results = {}  
  for (var i = 0; i < events.length; i++){
    var curr_event = events[i]
    var event_id = curr_event._id.toString()
    
    var attending_num = attending_num_list[event_id]
    var event_comp = event_compatibility[event_id]
    var time_till = time_to_events[event_id]
    var result =0;
    
    if(attending_num > 26) {attending_num = 26}
    if(time_till< 0) {result = 0;} else
    {result = 3*attending_num + 100*event_comp + (365 - Math.abs(time_till)) * 0.33;}
    
    final_results[event_id] = result
  }
  console.log("middle of determine final")
  var ret_val = events;
  for (var i = 0; i < events.length; i++){
    var event_id = events[i]._id.toString()
    console.log(final_results[event_id])
    if (final_results[event_id] <= 0 || final_results[event_id] > 300){
      var index = i
      ret_val.splice(index, 1);
    }
  }
  console.log(ret_val)
  return ret_val
}

function calculateEventTimeFromNow(events){
  var event_times_from_now = {}
  var now = Date.now();
  for (var i = 0; i < events.length; i++){
    var event_date = new Date(events[i].date)
    var diff = event_date - Date.now()
    var one_day = 1000*60*60*24;  /*time of day in milliseconds*/
    var time_from_now = diff/one_day
    event_times_from_now[events[i]._id.toString()] = time_from_now
  }
  console.log(event_times_from_now)
  return event_times_from_now
}

function calculateEventCompatibility(events, user){
  //ratio of same tags to sum of (user tags + event tags) - duplicates?
  var event_user_num_similar_tags = {}
  
  //loop through events
  for(var i = 0; i < events.length; i++){
    //loop through event tags
    var tag_count = 0
    var curr_event = events[i]
    for(var j = 0; j < curr_event.tags.length; j++){
      var event_tag = curr_event.tags[j].toLowerCase();
      for (var k = 0; k < user.tags.length; k++){
        var user_tag = user.tags[k].toLowerCase();
        if(user_tag === event_tag)
          tag_count ++
      }
    }
    var sum_tags_count = events[i].tags.length + user.tags.length
    if(sum_tags_count - tag_count != 0){
      event_user_num_similar_tags[curr_event._id.toString()] = tag_count/(sum_tags_count-tag_count);
    } else {
      event_user_num_similar_tags[curr_event._id.toString()] = 1
    }
      
  }
  console.log(event_user_num_similar_tags);
  return event_user_num_similar_tags
  
}
function calculateFollowingFollower(events, user){
  /*
  Loop through each event, 
  calculate the number of followers/following going for the event, sort the dictionary
     
    //sort sum_events?
    //combine the data somehow.
    //and multiply by some ratio?
    //also maybe check for duplicates in same event.
    
    //return array of events in the combined calculated order.
  */
  var event_followers = {}
  var event_following = {}
  var sum_events = {}
  for(var i = 0; i < events.length; i++){
    var curr_event = events[i]
    var attending_list = curr_event.attenders

    var count_followers = 0
    var count_following = 0
    
    //get attendent
    for(var j = 0; j < attending_list.length; j++){
      var attendent = attending_list[j]._id.toString()
      
      //check followers
      for(var k = 0; k < user.followers.length; k++){
        if(user.followers[k].toString() === attendent){
          count_followers++
        }
      }

      //check following
      for(var n = 0; n < user.following.length; n++){
        if(user.following[n].toString() === attendent){
          count_following++
        }
      }
      //sum it up.
      sum_events[curr_event._id.toString()] = (count_following*1.2) + (count_followers*0.8)
    }

  }
  console.log(sum_events)
  return sum_events
  //sort it.?
  //var events_sorted = Object.keys(sum_events).sort(function(a,b){return sum_events[a]-sum_events[b]})
  //console.log(events_sorted)
}

app.get('/event_chat_room/:id', app.common.isLoggedIn, function(req,res){
  console.log(req.user)
  Event.findById(req.params.id)
       .select('title location host attenders')
       .populate('host attenders', 'firstName lastName')
       .exec(function(err, event){
         //console.log(event);
         //console.log(req.user);
         var index = rooms_list.indexOf(event._id.toString());
         console.log("event._id value: " + event._id.toString())
         console.log("event._id type: " + typeof(event._id.toString()))
         console.log("index: " + index);
         if (index != -1){
           console.log(rooms_list);
           res.render('event_chat_room.jade', {event: event, user: req.user})
         } else {
           rooms_list.push(event._id.toString());
           console.log(rooms_list);
           console.log(typeof(rooms_list[0]));
           res.render('event_chat_room.jade', {event: event, user: req.user})
         }
       })
})

app.get('/event/:id', app.common.isLoggedIn, function(req,res){
  //console.log('@jade', req.params.id)
  console.log(req.user)
  Event.findById(req.params.id)
       .select('title location host attenders date tags')
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


app.post('/create_event', app.common.isLoggedIn, function(req,res){
  //console.log(req.body)
  var newEvent = new Event({
    title: req.body.title,
    location: req.body.location,
    description: req.body.description,
    date: req.body.date,
    host: req.user,
    attenders: [req.user._id]
  });
  console.log(newEvent);
  newEvent.save(function(err){
    if(err) console.log(err);
    else{
      //TODO: save to user hosting.
      //console.log(req.user.hosting)
      req.user.hosting.push(newEvent._id);
      req.user.attending.push(newEvent._id);
      req.user.save(function(err){

      //TODO: add to list of event ids.

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
           console.log(event)
           res.render('create_or_edit_event.jade', {event: event});
         }
       })
})

app.post('/edit_event_final', app.common.isLoggedIn, function(req,res){
  Event.findById(req.body.edit_id).exec(function(err,event){
    //Dealing with the Tags
    var split_tags = req.body.tags.split(',')
    console.log("split_tags------------------------ " + split_tags);
    for (var i = 0; i < split_tags.length; i++){
      //check if it is in Event tags list.
      var index = event.tags.indexOf(split_tags[i])
      if(index == -1){ //tag doesnt exist
        event.tags.push(split_tags[i])
      } else {
        //do nothing
      }
    }
    event.title = req.body.title
    event.location = req.body.location
    event.description = req.body.description
    event.date = req.body.date
    event.save(function(err){
      if(err)console.log(err) 
      else {
        res.redirect('/event/'+req.body.edit_id);
      }
    })
  });
});
/*
  Event.findById(req.body.edit_id).exec(function(err,event){
         console.log("edit_event_final - Event.findbyid")
         if(err)console.log(err)
         else{
           //Find User
           User.findById(req.user._id).exec(function(err,user){
                 if(err) console.log(err)
                 else{
                 //Dealing with the Tags
                 var split_tags = req.body.tags.split(',')
                 console.log("split_tags------------------------ " + split_tags);
                  var tags = []
                  for (var i = 0; i < split_tags.length; i++){
                    console.log(i);
                    var tag_name = split_tags[i];
                    console.log(tag_name)
                    Tag.findOne({ tagName: tag_name}).exec(function(err, tag){
                      console.log("Tag.findOne!")
                      if(err) console.log(err);
                      console.log("tag.findone()-------------------------- " + tag)
                      tags = []
                      if(!tag){
                        var temp_tag = new Tag({
                          tagName: split_tags[i],
                          events: [event._id],
                          users: [user._id]
                        })
                        temp_tag.save(function(err){
                          console.log("save tag in tag.findone")
                          if(err)console.log(err)
                        })
                        
                        user.tags.push(temp_tag._id)
                        user.save(function(err){
                          if(err)console.log(err)
                        })
                        
                        event.tags.push(temp_tag._id)
                        event.title = req.body.title
                        event.location = req.body.location
                        event.description = req.body.description
                        event.date = req.body.date
                        event.save(function(err){
                          if(err)console.log(err) 
                        })
                      } else {
                        tag.events.push(event._id);
                        tag.users.push(user._id);
                        tag.save(function(err) {
                            console.log("err:" + err);
                        });
                        tag.save(function(err){
                          if(err)console.log(err)
                        })
                        
                        user.tags.push(tag._id);
                        user.save(function(err){
                          if(err)console.log(err)
                        })
                        
                        event.tags.push(tag._id)
                        event.tags.push(temp_tag._id)
                        event.title = req.body.title
                        event.location = req.body.location
                        event.description = req.body.description
                        event.date = req.body.date
                        event.save(function(err){
                          if(err)console.log(err) 
                        })
                        console.log("user ------------------------" + user);
                        console.log("event -----------------------" + event);
                      }
                    });
                  }
                  res.redirect('/event/'+req.body.edit_id)
                }})
            }
         })
  */


app.post('/delete_event', app.common.isLoggedIn, function(req,res){
  Event.findById(req.body.del_id)
       .exec(function(err,event){
         if(err)console.log(err);
         else{
           User.update({}, {$pull: {"attending": {"$in": [mongoose.Types.ObjectId(req.body.del_id)]}}},{multi:true},function(err,obj){
             if(err)console.log(err)
             else{
               User.update({}, {$pull:{"hosting":{"$in": [mongoose.Types.ObjectId(req.body.del_id)]}}},{multi:true},function(err,obj){
                 if(err)console.log(err)
                 else{
                   Event.remove({_id: event._id}, function(err,obj){
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



//End of Routing ----------------------------------------------------------------------------------------------


//Chat room
//------------------------------------------------------------------------------------------------------------------------
var usernames = {};
var numUsers = {};

function NumClientsInRoom(namespace, room) {
  var clients = io.nsps[namespace].adapter.rooms[room];
  return Object.keys(clients).length;
}

io.sockets.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    io.sockets.in(socket.room).emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (data) {
    console.log(data);

    // we store the username in the socket session for this client
    socket.username = data.username;
    //console.log(typeof(data.event_id.toString()))
    //console.log(data.event_id.toString())
    var event_id = data.event_id.toString();
    socket.room = event_id;
    //console.log(event_id);
    //console.log(socket.room);
    
    
    if (numUsers[socket.room] == undefined) {
      numUsers[socket.room] = 1;
    } else {
      numUsers[socket.room]++;
    }
    
    //var room = io.sockets.adapter.rooms[event_id];
    //console.log(room);
    /*
    numUsers = Object.keys(room).length;
    */
    //console.log(io.of(event_id).sockets.length);
    // add the client's username to the global list
    
    console.log(numUsers)
    usernames[data.username] = data.username;
    addedUser = true;
    console.log("Added user " + data.username);
    
    //join event room
    socket.join(socket.room);
    
    socket.emit('login', {
      numUsers: numUsers[socket.room]
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.to(socket.room).emit('user joined', {
      username: socket.username,
      numUsers: numUsers[socket.room]
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    // remove the username from global usernames list
    if (addedUser) {
      delete usernames[socket.username];
      /*
      var room = io.sockets.adapter.rooms[socket.room];
      numUsers = Object.keys(room).length;
      */
      numUsers[socket.room]--;

      /*
		  // update list of users in chat, client-side
		  io.sockets.emit('updateusers', usernames);
      */
      
      // echo globally that this client has left
      socket.broadcast.to(socket.room).emit('user left', {
        username: socket.username,
        numUsers: numUsers[socket.room]
      });
      socket.leave(socket.room)
    }
  });
  

  socket.on('host online', function(data){
    console.log(data)
    socket.broadcast.to(socket.room).emit('update host',{hoster: data})
  })

  // when the client emits 'start typing', we broadcast it to others
  socket.on('start typing', function () {
    socket.broadcast.to(socket.room).emit('start typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.to(socket.room).emit('stop typing', {
      username: socket.username
    });
  });
});

//------------------------------------------------------------------------------------------------------------------------


server.listen(process.env.PORT || 3000, function(){
    //.listen(3000, function() {
	console.log('Listening on Port 3000');
});
