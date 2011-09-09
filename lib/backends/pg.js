/* SQL Middleware Framework by @jheusala */

/*
 * Copyright (C) 2011 by Jaakko-Heikki Heusala <jheusala@iki.fi>
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of 
 * this software and associated documentation files (the "Software"), to deal in 
 * the Software without restriction, including without limitation the rights to 
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies 
 * of the Software, and to permit persons to whom the Software is furnished to do 
 * so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all 
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
 * SOFTWARE.
 */

/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */

var sys = require('sys');

/* PostgreSQL backend builder */
module.exports = function(conf, options) {
	options = options || {};
	var pg = require('pg'),
	    client;
	return {
		'type': 'pg',
		'placeholder': function(i) { return '$'+i; },
		'connect': function(cb) {
			var connectError, connectSuccess;
			if(!client) {
				if(options.debug) {
					console.log('sqlmw: pg: Connecting to server...');
				}
				client = new pg.Client(conf);
				
				connectError = function(err) {
					client.removeListener('connect', connectSuccess);
					cb(err);
				};
				
				connectSuccess = function() {
					client.removeListener('error', connectError);
					if(options.debug) {
						console.log('sqlmw: pg: Connected!');
					}
					cb();
				};
				
				client.once('error', connectError);
				client.once('connect', connectSuccess);
				client.connect();
			} else {
				if(options.debug) {
					console.log('sqlmw: pg: was connected already.');
				}
				cb();
			}
		},
		'query': function(query, values, cb) {
			if(!client) {
				return cb(new TypeError("!client"));
			}
			if(options.debug) {
				console.log('Executing query: ' + query);
				console.log('values = ' + sys.inspect(values) );
				console.log('cb = ' + sys.inspect(cb) );
			}
			client.query(query, values, function(err, result) {
				if(options.debug) {
					if(err) {
						console.log('failed query with error: ' + sys.inspect(err));
					} else {
						console.log('successful query with result: ' + sys.inspect(result));
					}
				}
				cb(err, result && result.rows);
			});
		},
		'disconnect': function(cb) {
			if(!client) {
				return cb(new TypeError("!client"));
			}
			if(options.debug) {
				console.log('sqlmw: pg: Disconnecting from server...');
			}
			client.end();
			/*
			if(options.debug) {
				console.log('sqlmw: pg: Disconnected from server');
			}
			*/
			//setTimeout(function() {
			client = undefined;
			cb();
			//}, 250);
		}
	};
};

/* EOF */
