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
	lib;

/* Create SQL object */
lib = module.exports = function(type, conf, orig_args) {

	function get_backend(name) {
		return require('./backends/'+name+'.js');
	}
	
	var args = orig_args || {},
	    sql = {};
	
	// Set debug flag
	sql._debug = args.debug ? true : false;
	
	// Expose backend object outside too
	sql.backend = get_backend(type)(conf, {'debug':sql._debug});
	
	require('./middlewares/connect.js')(sql);
	
	/* Create a group of SQL queries to do a task */
	sql.group = function() {
		var sql = this,
		    wares = [];
		foreach(arguments).each(function(ware) {
			wares.push(ware);
		});
		return function(options, next) {
			try {
				var state = {}, 
				    i=0, 
				    last_state = state;
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
		var sql = this;
		return function(options, next) {
			if(key) {
				options[key] = value;
			}
			next();
		};
	};
	
	/* Returns middleware for SQL query */
	sql.query = function(q) {
		var sql = this;
		return function(options, next) {
			
			var q_keys = [],
			    q_values = [],
			    q_str,
			    is_select,
			    is_insert,
			    i;
			
			if(sql._debug) {
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
				return sql.backend.placeholder(i);
			});
			
			if(sql._debug) {
				console.log('  q_str = ' + sys.inspect(q_str) );
				console.log('  q_keys = ' + sys.inspect(q_keys) );
				console.log('  q_values = ' + sys.inspect(q_values) );
			}
			
			is_select = q_str.match(/^select/i) ? true : false;
			is_insert = q_str.match(/^insert/i) ? true : false;
			
			sql.backend.query(
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
						if(sql._debug) {
							console.log('  results = ' + sys.inspect(results));
						}
						if(results.length === 1) {
							foreach(results).each(function(row) {
								foreach(row).each(function(v, k) {
									if(sql._debug) {
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
		var sql = this;
		return function(options, next) {
			sql.backend.disconnect(next);
		};
	};
	
	return sql;
};

/* EOF */
