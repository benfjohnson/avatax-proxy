var AWS = require('aws-sdk');
var https = require('https');

// don't keep this in source for the final code
var AVA_KEY = 'foo';

var BUCKET = 'daily-key';
var KEY = 'dasKey';

var s3Bucket = new AWS.S3({Bucket: BUCKET, Key: KEY});

var buildQueryString = function(queryObj) {
    return Object.keys(queryObj).reduce(function(queryString, qKey) {
        var paramValNoSpaces = queryObj[qKey].replace(/\s/g, '%20');
        return queryString + qKey + '=' + paramValNoSpaces + '&';
    }, '?');
};

exports.handler = function(event, context) {
    console.log(JSON.stringify(event, null, 2));
    
    var reqKey = event.params.header['api-key'];

    // retrieve the latest api key in s3
    s3Bucket.getObject({Bucket: BUCKET, Key: KEY}, function(err, key) {
        if (err) {
            console.log('Unable to fetch API key from s3', err);
            return;
        }
        
        var validKey = key.Body.toString('utf8');
        
        console.log('KEYS', reqKey, validKey);
        // does request key match?
        if (reqKey !== validKey) {
            console.log('Unable to authorize request. Invalid API key provided.');
            return; // This should send a bad auth status back with text...
        }

        // key matched, so use our legit key to call into Avalara
        var options = {
            hostname: 'development.avalara.net',
            path: '/1.0' + event.context['resource-path'] + buildQueryString(event.params.querystring),
            method: event.context['http-method'],
            headers: {
                'Authorization': AVA_KEY,
                'Content-Type': 'application/json'
            }
        };
        
        console.log('PATH', options.hostname + options.path);

        var req = https.request(options, function(res) {
            console.log('STATUS: ' + res.statusCode);
            console.log('HEADERS: ' + JSON.stringify(res.headers, null, 2));

            res.on('data', function(chunk) {
                console.log('BODY: ' + chunk);
            });
            
            res.on('end', function() {
                console.log('all done');
            });

            res.on('error', function(e) {
                console.log('ERROR: ' + e);
            });

        });
        
        req.end();
    });

};