"use strict";
var express = require('express');
var serveStatic = require( "serve-static" );

var app = express();

// on root directory - serve static HTML directory
app.use('/', serveStatic('./static'));

// on 'mixer' - serve 
app.get('/stamp', function (req, res) {
    stampAPI(req,res);
});
app.post('/stamp', function (req, res) {
    stampAPI(req,res);
});

// mapping api to core function
var stampAPI = function(req, res) {

	console.log(JSON.stringify(req.query));

	var inArray = new Array();
	if (typeof req.query.in != "undefined" ) {
		inArray = req.query.in;
	}

    var result =  {};

    res.send(result);
};

// starting server
app.listen(3006,function(err){
	console.log('Server listening at http://localhost:3006');
});