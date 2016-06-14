var AWS = require('aws-sdk');
var https = require('https');

// don't keep this in source for the final code
var AVA_KEY = 'foo';

var BUCKET = 'daily-key';
var KEY = 'dasKey';

var s3Bucket = new AWS.S3({Bucket: BUCKET, Key: KEY});

var buildQueryString = function(queryObj) {
    var queryStringKeys = Object.keys(queryObj);
    if (queryStringKeys.length === 0) {
        return '';
    }
    return queryStringKeys.reduce(function(queryString, qKey, i) {
        var paramValNoSpaces = queryObj[qKey].replace(/\s/g, '%20');
        var terminalChar = i == queryStringKeys.length ? '' : '&';
        return queryString + qKey + '=' + paramValNoSpaces + terminalChar;
    }, '?');
};

// Helper function for replacing dynamic path parameters with their values
// e.g. /users/{user} becomes /users/bob
var replacePathParameters = function(resourcePath, pathParams) {
    var retPath = resourcePath;
    var pathParamRegex = /\{[\w-\_\d]+\}/g;
    var matches = resourcePath.match(pathParamRegex);
    
    if (!matches) {
        return retPath;
    }
  
    matches.forEach(function(match) {
        // remove brackets from match
        var matchNoBrackets = match.substring(1, match.length - 1);
        // look up event's value for this parameter
        var paramValue = pathParams[matchNoBrackets];
        resourcePath = resourcePath.replace(match, paramValue);
    });
    
    console.log('RESOURCE PATH', resourcePath);
  
   return resourcePath;
};

exports.handler = function(event, context, callback) {
    // console.log('***** RECEIVED LAMBDA REQUEST *****', JSON.stringify(event, null, 2));

    var reqKey = event.params.header['api-key'];

    // retrieve the latest api key in s3
    s3Bucket.getObject({Bucket: BUCKET, Key: KEY}, function(err, key) {
        if (err) {
            console.log('Unable to fetch API key from s3', err);
            return;
        }

        var validKey = key.Body.toString('utf8');

        console.log('KEYS', reqKey, reqKey === validKey);
        // does request key match?
        if (reqKey !== validKey) {
            console.log('Unable to authorize request. Invalid API key provided.');
            return; // This should send a bad auth status back with text...
        }
    
        // Replace any path parameters with their correct values
        // e.g., /{lat-long}/ becomes /22.2424,-127.3535/
        var resourcePath = replacePathParameters(event.context['resource-path'], event.params.path);
    
        // key matched, so use our legit key to call into Avalara
        var options = {
            hostname: 'development.avalara.net',
            path: '/1.0' + resourcePath + buildQueryString(event.params.querystring || {}),
            method: event.context['http-method'],
            headers: {
                'Authorization': AVA_KEY,
                'Content-Type': 'application/json'
            }
        };

        console.log('AVATAX REQUEST PATH', options.hostname + options.path);

        console.log('AVATAX REQUEST OPTIONS', options);

        var req = https.request(options, function(res) {
            console.log('AVATAX REQUEST STATUS: ' + res.statusCode);
            console.log('AVATAX REQUEST HEADERS: ' + JSON.stringify(res.headers, null, 2));

            var resData = '';

            res.on('data', function(chunk) {
                resData = resData + chunk;
            });

            res.on('end', function() {
                console.log('resData', resData);
                callback(null, JSON.parse(resData));
            });

            res.on('error', function(e) {
                console.log('ERROR: ' + e);
                callback(e, null);
            });
        });

        if (event.context['http-method'] === 'POST') {
            req.write(JSON.stringify(event['body-json']));
        }
        req.end();
    });

};