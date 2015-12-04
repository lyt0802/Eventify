/*
app.use(express.static(__dirname + '/www'));
app.get('/', function(req, res){
   res.render("/www/index.html");  // render index.html
});

app.locals.pretty = true;
app.set('views', process.cwd() + '/views');
app.set('view engine', 'jade');

*/

for attendee in event.attenders
  h4 #{attendee.firstName} #{attendee.lastName}
  if attendee._id == user._id
    attendent = false
  if attendee._id != user.id
    attendent = true

if attendent == false && user._id != event.host._id

    else if attendent == true && user._id != event.host._id
