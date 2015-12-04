var mongoose = require('mongoose');


var eventSchema = new mongoose.Schema({
  //active: {type: Boolean, default: false},
  title: {type: String, required: true},
  location: {type: String, required: true},
  description: {type: String, required: true},
  date : {type: Date},
  host : {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  attenders : [{type: mongoose.Schema.Types.ObjectId, ref:'User'}],
  tags: [{type: String }]

});

var Event = mongoose.model('Event', eventSchema);

module.exports = Event;
