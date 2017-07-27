"use strict";
var fs = require('fs');
var express = require('express');
var bb = require('express-busboy');
var serveStatic = require( "serve-static" );
var imagemagick = require('imagemagick');
var watermark = require("image-watermark");
var exiftool = require('node-exiftool');

var app = express();

bb.extend(app, {
    upload: true,
    path: './uploads',
    allowedPath: /./
});

// on root directory - serve static HTML directory
app.use('/', serveStatic('./static'));

//app.use(express.bodyParser({ keepExtensions: true, uploadDir: '/temp' }));

// on 'stamp' - serve
app.get('/stamp', function (req, res) {

    res.writeHead(400, {'Content-Type': 'text/plain' });
    res.end("WARNING: Service just works with POST request");

});

app.post('/stamp', function (req, res) {

    console.log("** POST ********************");

    // debug request
	// console.log("req",JSON.stringify(Object.keys(req)));
    // console.log("req.body",JSON.stringify(req.body));
    // console.log("req.files.file",JSON.stringify(req.files.file));

    // request got author
    if (typeof req.body.autor === "undefined") {
        res.status(500).send('missing autor parameter');
        return;
    }

    // request got file upload
    if (typeof req.files.file === "undefined") {
        res.status(500).send('missing file upload');
        return;
    }

    // file is PNG image
    if (req.files.file.mimetype !== "image/png") {
        res.status(500).send('file upload is not image/png');
        return;
    }

    // make sure external process has permission to edit file
    try {
        fs.chmodSync(req.files.file.file, '777');
    } catch (e) {
        console.log("ERROR FAILED chmod in upload", e);
    }

    // start changing img
    determineBackgroundColor(req, res);

});

// starting server
app.listen(3006,function(err){
    console.log('Server listening at http://localhost:3006');
});

var determineBackgroundColor = function(req, res) {
    req.image_backgroundColor = "ffffff";
    extendBottom(req, res);
};

var extendBottom = function (req, res) {

    // determine height of image
    imagemagick.identify(['-format', '%h', req.files.file.file], function(err, height){
        if (!err) {
            console.log("OK --> IMAGE HEIGHT: "+height);
            req.image_height = parseInt(height);
            imagemagick.identify(['-format', '%w', req.files.file.file], function(err, width){
                if (!err) {
                    console.log("OK --> IMAGE WIDTH: "+width);
                    req.image_width = parseInt(width);
                    imagemagick.convert([req.files.file.file,'-background','#'+req.image_backgroundColor,'-extent', req.image_width+'x'+(req.image_height+25),req.files.file.file], function(err, result){
                        if (!err) {
                            console.log("OK --> ADDED FOOTER SPACE");
                            stampInfo(req, res);
                        } else {
                            cleanup(req, res, "FAILED TO ADD FOOTER SPACE: "+JSON.stringify(err));
                        }
                    });
                } else {
                    cleanup(req, res, "FAILED TO GET IMAGE WIDTH: "+JSON.stringify(err));
                }
            });
        } else {
            cleanup(req, res, "FAILED TO GET IMAGE HEIGHT: "+JSON.stringify(err));
        }
    });

};

var stampInfo = function(req, res) {

    try {
        var options = {
            'text' 				    : 'CC-BY '+req.body.autor,
            'override-image'		: true,
            'position'              : 'South',
            'color'				    : 'darkgrey',
            'resize' 			    : '100%',
            'align'                 : 'ltr'
        };
        watermark.embedWatermarkWithCb(req.files.file.file, options, function(err){

            if (!err) {

                console.log("OK Watermark");

                addExifData(res, req);

            } else {
                cleanup(req, res, "FAILED TO WATERMARK (CB): "+JSON.stringify(err));
            }

        });


    } catch (e) {
        cleanup(req, res, "FAILED TO WATERMARK: "+JSON.stringify(e));
    }
};

var addExifData = function(res, req) {

    var ep = new exiftool.ExiftoolProcess();
    ep.open().then(
        function() {
            ep.writeMetadata(req.files.file.file, {
                all: '', // remove existing tags
                comment: 'Exiftool rules!',
                'Keywords+': [ 'keywordA', 'keywordB' ]
            }, ['overwrite_original'])})
        .then(console.log, console.error)
        .then(function() {
            ep.close();

            // load and return uploaded image as response
            var img = fs.readFileSync(req.files.file.file);
            res.writeHead(200, {'Content-Type': 'image/png' });
            res.end(img, 'binary');

            cleanup(req, res);
        }).catch(console.error);

    /*
    ep.open().then( function() {
    }
    => ep.writeMetadata(req.files.file.file, {
        all: '',
        'Artist' : 'hupfer',
        'Copyright' : 'CC-BY',
        'CopyrightNotice'                : 'CC-BY',
        'CopyrightFlag'                 : 'True',
        'URL'                            : 'http://www.swsw.swwdede.de',
        'xmp:usageterms':'usage terms',
        'By-line' : 'autor hupfer',
        'Object Name'   : 'ein titel',
        'Rights'  : 'CC-BY',
        'Title' : 'titel',
        'Creator'  :'autor hupfer',
        'WebStatement'                 : 'http://www.swsw.swwdede.de',
        'Object'                          : 'ein titel'

    }, ['overwrite_original'])).then(console.log, console.error).then(() => ep.close()).catch(console.error);
    */

};

var cleanup = function(req, res, errMsg) {

    // delete uploaded file
    deleteFolderRecursive("./uploads/"+req.files.file.uuid);

    // final respond with error message
    if (typeof errMsg !== "undefined") {
        console.log("FAIL: "+errMsg);
        res.status(500).send(errMsg);
    }

};

// tool function to delete a folder with its content
var deleteFolderRecursive = function(path) {
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};