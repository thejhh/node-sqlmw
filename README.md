Middleware Framework for SQL
============================

Description
-----------

This is a simple framework to combine multiple async SQL queries into usable 
callback functions.

Installation for Node.js
------------------------

Simplest way to install is to use [npm](http://npmjs.org/), just simply `npm install sqlmw`.

License
-------

MIT-style license, see [INSTALL.txt](http://github.com/jheusala/node-sqlmw/blob/master/LICENSE.txt).

Examples
--------

See [examples/](https://github.com/jheusala/node-sqlmw/tree/master/examples).

Initializing the `sql` object is easy:

	var config = {'host': 'localhost', 'user': 'user', 'password': 'hello', 'database': 'dbname'},
	    sql = require('sqlmw')('mysql', config);

You can create saved callback functions like this:

	var delete_player = sql.query('DELETE FROM player WHERE game_id=:game_id AND number=:number LIMIT 1');

And also group multiple callbacks into one single callback function this way:

	var insert_player = sql.group(
		sql.query('SELECT COUNT(number)+1 AS number FROM player WHERE game_id=:game_id'),
		sql.query('INSERT INTO player (number, game_id) VALUES (:number, :game_id)')
	);

And use `insert_player` like this:

	insert_player({'game_id':1}, function(err) {
		if(err) console.log('Failed to add player: ' + err);
		else console.log('Successfully added player');
	});

You can also use `insert_player` as a middleware when grouping:

	var useless_operation = sql.group(insert_player, delete_player);
