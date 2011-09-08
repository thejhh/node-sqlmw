/* SQL Middleware Framework
 * Copyright 2011 Jaakko-Heikki Heusala <jheusala@iki.fi>
 */

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

var fs = require('fs'),
    sys = require('sys'),
	foreach = require('snippets').foreach,
	backends,
	lib;

function _build_backends(options) {
	var backends = {};
	options = options || {};
	
	/* MySQL backend builder */
	backends.mysql = function(conf) {
		var client;
		return {
			'type': 'mysql',
			'placeholder': function(i) { return '?'; },
			'connect': function(cb) {
				if(!client) {
					client = require('mysql').createClient(conf);
				}
				cb();
			},
			'query': function(query, values, cb) {
				if(!client) {
					return cb(new TypeError("!client"));
				}
				client.query(query, values, function(err, result) {
					if(err && options.debug) {
						console.log('query failed with: ' + err);
					}
					cb(err, result);
				});
			},
			'disconnect': function(cb) {
				if(!client) {
					return cb(new TypeError("!client"));
				}
				client.end(function(err) {
					cb(err);
					client = undefined;
				});
			}
		};
	};
	
	/* PostgreSQL backend builder */
	backends.pg = function(conf) {
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
	
	return backends;
}

/* Create SQL object */
lib = module.exports = function(type, conf, orig_args) {
	var args = orig_args || {},
	    debug = args.debug ? true : false,
		backend,
	    sql = {};
	
	if(!backends) {
		backends = _build_backends({'debug':debug});
	}
	if(! (backends[type] && (typeof backends[type] === 'function')) ) {
		throw new TypeError('Unsupported backend: ' + type);
	}
	backend = backends[type](conf);
	
	// Expose backend object outside too
	sql.backend = backend;
	
	/* Middleware to connect backend to server if there is no connection */
	sql.connect = function() {
		return function(options, next) { backend.connect(next); };
	};
	
	/* Create a group of SQL queries to do a task */
	sql.group = function() {
		var wares = [];
		foreach(arguments).each(function(ware) {
			wares.push(ware);
		});
		return function(options, next) {
			try {
				var state = {}, i=0, last_state = state;
				foreach(options).each(function(o, k) { state[k] = o; });
				function iter() {
					if(! (wares[i] && (typeof wares[i] === 'function')) ) {
						next(undefined, last_state);
						return;
					}
					wares[i](state, function(err, our_last_state) {
						if(err) {
							next(err);
							return;
						}
						last_state = our_last_state;
						i = i+1;
						iter();
					});
				}
				iter();
			} catch(err) {
				next(err);
			}
		};
	};
	
	/* Returns middleware to assign static key=value setting */
	sql.assign = function(key, value) {
		return function(options, next) {
			if(key) {
				options[key] = value;
			}
			next();
		};
	};
	
	/* Returns middleware for SQL query */
	sql.query = function(q) {
		return function(options, next) {
			
			var q_keys = [],
			    q_values = [],
			    q_str,
			    is_select,
			    is_insert,
			    i;
			
			if(debug) {
				console.log('sql.query:');
				console.log('  q = ' + sys.inspect(q) );
				console.log('  options = ' + sys.inspect(options) );
			}
			
			i = 0;
			q_str = q.replace(/:([a-zA-Z0-9_]+)/g, function(match, contents, offset, s) {
				var key = ""+contents;
				if(!options[key]) {
					return ':'+key;
				}
				q_keys.push(key);
				q_values.push(options[key]);
				i = i + 1;
				return backend.placeholder(i);
			});
			
			if(debug) {
				console.log('  q_str = ' + sys.inspect(q_str) );
				console.log('  q_keys = ' + sys.inspect(q_keys) );
				console.log('  q_values = ' + sys.inspect(q_values) );
			}
			
			is_select = q_str.match(/^select/i) ? true : false;
			is_insert = q_str.match(/^insert/i) ? true : false;
			
			backend.query(
				q_str,
				q_values,
				function(err, results) {
					if(err) {
						next(err);
						return;
					}
					if(is_insert && results && results.insertId) {
						options._insertId = results.insertId;
					}
					if(is_select) {
						if(debug) {
							console.log('  results = ' + sys.inspect(results));
						}
						if(results.length === 1) {
							foreach(results).each(function(row) {
								foreach(row).each(function(v, k) {
									if(debug) {
										console.log('  Setting ' + k + ' = ' + v);
									}
									options[k] = v;
								});
							});
						}
						options._rows = results || [];
						if(!options._results) {
							options._results = [];
						}
						options._results.push(results);
					}
					next(undefined, options);
				}
			);
		};
	};
	
	/* Middleware to disconnect client */
	sql.disconnect = function() {
		return function(options, next) {
			backend.disconnect(next);
		};
	};
	
	return sql;
};

// Expose backends objects
module.exports.backends = backends;

/* EOF */
