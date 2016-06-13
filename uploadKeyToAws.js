/* Author: Ben Johnson
 * Description: Creates a unique ID and uploads to Incubator's daily-key AWS bucket
 * */

'use strict';

var AWS = require('aws-sdk');
var crypto = require('crypto');

var BUCKET = 'daily-key';
var KEY = 'dasKey';

var s3Bucket = new AWS.S3({Bucket: BUCKET, Key: KEY});

exports.handler = function(_, __) {
  crypto.randomBytes(16, function(err, bytes) {
      if (err) {
        console.log('Unable to generate new crypto key..', err);
        return;
      }
      
      var token = bytes.toString('hex');
      
      s3Bucket.upload({Bucket: BUCKET, Key: KEY, Body: token}, function(err, _) {
          if (err) {
              console.log('Error uploading new key to s3', err);
              return;
          }

          console.log('GREAT SUCCESS, KEY UPLOADED!');
          console.log(BUCKET + '[' + KEY + '] = ' + token);
      })
  });
};

