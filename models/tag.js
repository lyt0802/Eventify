var mongoose = require('mongoose');

var tagSchema = new mongoose.Schema({
    tagName: { type: String, unique: true },
    events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event'}],
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

var Tag = mongoose.model('Tag', tagSchema);

module.exports = Tag;