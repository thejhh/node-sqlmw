/* SQL Middleware Framework
 * Copyright 2011 Jaakko-Heikki Heusala <jheusala@iki.fi>
 */

var fs = require('fs'),
    sys = require('sys'),
	foreach = require('snippets').foreach;

/* Create SQL object */
module.exports = (function(type, conf, debug) {
	var client = require(type).createClient(conf);
	var sql = {};
	
	/* Create a group of SQL queries to do a task */
	sql.group = (function() {
		var wares = [];
		foreach(arguments).do(function(ware) {
			wares.push(ware);
		});
		return (function(options, next) {
			try {
				var state = {}, i=0;
				foreach(options).do(function(o, k) { state[k] = o; });
				function iter() {
					if(! (wares[i] && (typeof wares[i] === 'function')) ) {
						next();
						return;
					}
					wares[i](state, function(err) {
						if(err) {
							next(err);
							return;
						}
						i++;
						iter();
					});
				}
				iter();
			} catch(err) {
				next(err);
			}
		});
	});
	
	/* Returns middleware to assign static key=value setting */
	sql.assign = (function(key, value) {
		return (function(options, next) {
			if(key) options[key] = value;
			next();
		});
	});
	
	/* Returns middleware for SQL query */
	sql.query = (function(q) {
		return (function(options, next) {
			
			var q_keys = [],
			    q_values = [],
			    q_str;
			
			if(debug) console.log('sql.query:');
			if(debug) console.log('  q = ' + sys.inspect(q) );
			if(debug) console.log('  options = ' + sys.inspect(options) );
			
			// TODO: Parse named params from query and prepare q_values from options
			q_str = q.replace(/:([a-zA-Z0-9_]+)/g, function(match, contents, offset, s) {
				var key = ""+contents;
				if(!options[key]) return ':'+key;
				q_keys.push(key);
				q_values.push(options[key]);
				return '?';
			});
			
			if(debug) console.log('  q_str = ' + sys.inspect(q_str) );
			if(debug) console.log('  q_keys = ' + sys.inspect(q_keys) );
			if(debug) console.log('  q_values = ' + sys.inspect(q_values) );
			
			var is_select = q_str.match(/^select/i) ? true : false;
			
			client.query(
				q_str,
				q_values,
				function(err, results, fields) {
					if(err) {
						next(err);
						return;
					}
					if(is_select) {
						if(debug) console.log('  results = ' + sys.inspect(results));
						foreach(results).do(function(row) {
							foreach(row).do(function(v, k) {
								if(debug) console.log('  Setting ' + k + ' = ' + v);
								options[k] = v;
							});
						});
					}
					next();
				}
			);
		});
	});
	
	return sql;
});

/* EOF */
