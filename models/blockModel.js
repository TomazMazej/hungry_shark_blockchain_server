var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

var blockSchema = new Schema({
		'index' : Number,
		'timeStamp' : String,
		'data' : Object,
		'curHash' : String,
		'prevHash' : String
});

module.exports = mongoose.model('block', blockSchema);
