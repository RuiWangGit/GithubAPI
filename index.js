var restify = require('restify')
  , redis   = require('redis')
  , axios   = require('axios')
  , redis   = require('redis')
  , responseTime = require('response-time')
  , logger  = require('bunyan')
	;

var server = restify.createServer();
var client = redis.createClient();


var Logger = require( 'bunyan' );
global.log = new Logger( {
    name   : 'githubAPI',
    streams: [
        {
            stream: process.stdout
        }
    ]
});

server.on('after', restify.auditLogger({
  log: log
}));



server.use(responseTime());


server.get('/hello/:name', respond);
server.head('/hello/:name', respond);

server.get('/api/:username', function(req, res){
	console.log('test')
  // get the username parameter in the URL
  // i.e.: username = "coligo-io" in http://localhost:5000/api/coligo-io
  var username = req.params.username;
  console.log(';;;;;')

  // use the redis client to get the total number of stars associated to that
  // username from our redis cache
  client.get(username, function(error, result) {
  	console.log(username);

      if (result) {
        // the result exists in our cache - return it to our user immediately
        res.send({ "totalStars": result, "source": "redis cache" });
      } else {
        // we couldn't find the key "coligo-io" in our cache, so get it
        // from the GitHub API
        getUserRepositories(username)
          .then(getTotalRepos)
          .then(function(repos) {
            // store the key-value pair (username:totalStars) in our cache
            // with an expiry of 1 minute (60s)
            client.setex(username, 60, repos);
            // return the result to the user
            res.send({ "totalRepos": repos, "source": "GitHub API" });
          }).catch(function(response) {
            if (response.status === 404){
              res.send('The GitHub username could not be found. Try "ruiwanggit" as an example!');
            } else {
              res.send(response);
            }
          });
      }

  });
	
})


server.listen(9090, function(){
		console.log('%s listening at %s', server.name, server.url);
	}
)

client.on('error', function(err){
	console.log('Error ' + err);
});

function respond(req, res, next) {
  res.send('hello ' + req.params.name);
  next();
}

// call the GitHub API to fetch information about the user's repositories
function getUserRepositories(user) {
  //var githubEndpoint = 'https://api.github.com/users/' + user + '/repos' + '?per_page=100';
  var githubEndpoint ='https://api.github.com/users/' + user 
  console.log(githubEndpoint)
  return axios.get(githubEndpoint);
}


// add up all the stars and return the total number of stars across all repositories
function computeTotalStars(repositories) {
  return repositories.data.reduce(function(prev, curr) {
    return prev + curr.stargazers_count
  }, 0);
}

function getTotalRepos (repositories) {
  console.log(repositories)
  return repositories.data.public_repos;
}





