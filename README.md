Middleware Framework for SQL
============================

Description
-----------

This is a simple framework to combine multiple async SQL operations into usable 
callback functions.

Installation for Node.js
------------------------

Simplest way to install is to use [npm](http://npmjs.org/), just simply `npm install sqlmw`.

License
-------

MIT-style license, see [INSTALL.txt](http://github.com/jheusala/node-sqlmw/blob/master/LICENSE.txt).

Backends
--------

* [mysql](https://github.com/felixge/node-mysql)
* [pg](https://github.com/brianc/node-postgres)

Examples for MySQL
------------------

Initializing the `sql` object for MySQL:

	var config = {'host': 'localhost', 'user': 'user', 'password': 'hello', 'database': 'dbname'},
	    sql = require('sqlmw')('mysql', config);

You can create saved callback functions like this:

	var delete_player = sql.query('DELETE FROM player WHERE game_id=:game_id AND number=:number LIMIT 1');

And use `delete_player` like this:

	var connect = sql.connect();
	connect({}, function(err) {
		if(err) {
			console.log('Failed to connect: ' + err);
		} else {
			delete_player({'game_id':1,'number':1}, function(err) {
				if(err) console.log('Failed to add player: ' + err);
				else console.log('Successfully added player');
			});
		}
	});

Middleware `sql.connect()` can be executed more than once. It creates new clients only if connection is disconnected.

You can also group multiple middlewares into one single callback function this way:

	var insert_player = sql.group(
		sql.connect(),
		sql.query('SELECT COUNT(number)+1 AS number FROM player WHERE game_id=:game_id'),
		sql.query('INSERT INTO player (number, game_id) VALUES (:number, :game_id)'),
		sql.disconnect()
	);

And use `insert_player` simply like this:

	insert_player({'game_id':1}, function(err) {
		if(err) console.log('Failed to add player: ' + err);
		else console.log('Successfully added player');
	});

You can also use groups like `insert_player` as a middleware when grouping:

	var useless_operation = sql.group(insert_player, delete_player);
	useless_operation({}, function(err) {
		if(err) console.log('Failed: ' + err);
		else console.log('Successfully added AND removed a player');
	});

Examples for PostgreSQL
-----------------------

Initializing the `sql` object for PostgreSQL:

	var config = 'tcp://postgres:1234@localhost/postgres',
	    sql = require('sqlmw')('pg', config);

Interface for sqlmw with PostgreSQL is the same as with MySQL except obviously 
actual query strings might not be always compatible for both backends.

See more from [unit tests](https://github.com/jheusala/node-sqlmw/tree/master/test) and 
[examples/](https://github.com/jheusala/node-sqlmw/tree/master/examples).
