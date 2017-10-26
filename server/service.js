"use strict";
var fs = require('fs');
var express = require('express');
var bb = require('express-busboy');
var serveStatic = require( "serve-static" );
var imagemagick = require('imagemagick');
var exiftool = require('node-exiftool');
var dominantcolor   = require('dominant-color');
var watermark = require("./watermark.js");

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

app.options('/stamp', function(req, res) {
  console.log("writing headers only");
  res.header("Access-Control-Allow-Origin", "*");
  res.end('');
});

app.post('/stamp', function (req, res) {

    console.log("v2");
    console.log("** POST ********************");

    // debug request
	// console.log("req",JSON.stringify(Object.keys(req)));
    // console.log("req.body",JSON.stringify(req.body));
    // console.log("req.files.file",JSON.stringify(req.files.file));

    if ((typeof req.body.by === "undefined") || (req.body.by === null)) req.body.by = "";

    // request got license
    if (typeof req.body.license === "undefined") {
        res.status(500).send('missing license parameter');
        return;
    }

    // if not cc-0 a valid author string is needed
    if ((typeof req.body.license !== "cc-0") && (req.body.by.length===0)) {
        res.status(500).send('license needs valid by parameter');
        return;
    }

    // request got file upload
    if (typeof req.files.file === "undefined") {
        res.status(500).send('missing file upload');
        return;
    }

    // file is PNG image
    if ((req.files.file.mimetype !== "image/png") && (req.files.file.mimetype !== "image/jpeg")) {
        res.status(500).send('file upload MIME('+req.files.file.mimetype+') not allowed');
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

    // set default
    req.image_backgroundColor = "ffffff";
    req.image_textColor = "333333";

    // try to determine dominat color
    dominantcolor(req.files.file.file, function(err, color){
        if (!err) {

            // set new background color
            console.log("OK --> Background color: "+color);
            req.image_backgroundColor = color;

            // determine if black or white text color on background color
            if (getBrightnessFactorFromHexcode(color)<128) req.image_textColor = "cccccc";
            console.log("OK --> Text color: "+req.image_textColor);

        } else {
            console.log("FAIL --> Background color: ", err);
        }
        extendBottom(req, res);
    });
};

var extendBottom = function (req, res) {

    // determine height of image
    imagemagick.identify(['-format', '%h', req.files.file.file], function(err, height){
        if (!err) {
            req.image_height = parseInt(height);
            console.log("OK --> IMAGE HEIGHT: "+req.image_height);
            imagemagick.identify(['-format', '%w', req.files.file.file], function(err, width){
                if (!err) {
                    req.image_width = parseInt(width);
                    console.log("OK --> IMAGE WIDTH: "+req.image_width);
                    imagemagick.convert([req.files.file.file,'-background','#'+req.image_backgroundColor,'-extent', req.image_width+'x'+(req.image_height+15),req.files.file.file], function(err, result){
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

        var text = "CC0 (Public Domain)";
        if (req.body.license!=="cc-0") text = req.body.license.toUpperCase() + ' 4.0 by ' + req.body.by;
        console.log("Text for stamping: "+text);

        var options = {
            'text' 				    : text,
            'override-image'		: true,
            'position'              : 'South',
            'color'				    : '#'+req.image_textColor,
            'resize' 			    : '100%',
            'align'                 : 'ltr',
            'pointsize'             : '12'
        };
        watermark.embedWatermarkWithCb(req.files.file.file, options, function(err){

            if (!err) {

                console.log("OK --> STAMPING TEXT INFO ON IMAGE");

                if (stringEndsWith(req.files.file.file.toLowerCase(),'.png')) {
                    console.log("INFO --> Image is PNG - so skip EXIF data edit (just available on JPEG)");
                    returnFile(req, res);
                    cleanup(req, res);
                } else {
                    addExifData(req, res);
                }

            } else {
                cleanup(req, res, "FAILED TO STAMP (CB): "+JSON.stringify(err));
            }

        });


    } catch (e) {
        cleanup(req, res, "FAILED TO STAMP: "+JSON.stringify(e));
    }
};

var addExifData = function(req, res) {

    var ep = new exiftool.ExiftoolProcess();
    ep.open().then(
        function() {

            var license = "CC0 (Public Domain)";
            var licenseText = 'http://creativecommons.org/publicdomain/zero/1.0/deed';
            if (req.body.license!=="cc-0") {
                license = req.body.license.toUpperCase() + ' 4.0';
                licenseText = 'http://creativecommons.org/licenses/'+req.body.license.substr(3)+'/4.0/';
            }

            console.log("EXIFDATA License: "+license);
            console.log("EXIFDATA LicenseText: "+licenseText);

            ep.writeMetadata(req.files.file.file, {
                //all: '', // remove existing tags
                CreatorTool: 'ccstamper',
                Artist : req.body.by,
                Copyright : license,
                CopyrightNotice : licenseText,
                CopyrightFlag : (req.body.license!=="cc-0") ? 'False' : 'True'
            }, ['overwrite_original'])

            //ep.readMetadata(req.files.file.file, ['-File:all'])

            .then(console.log, console.error)
            .then(function() {

                console.log("OK --> EXIF DATA added");

                // success final
                ep.close();
                returnFile(req, res);
                cleanup(req, res);
            });

        });

};

// send back the uploaded (and modified) file
var returnFile = function(req, res) {
    var img = fs.readFileSync(req.files.file.file);
    var base64Start = 'data:image/png;base64,';
    if (stringEndsWith(req.files.file.file.toLowerCase(), ".png")) {
        res.writeHead(200, {'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*'});
    } else {
        res.writeHead(200, {'Content-Type': 'image/jpeg', 'Access-Control-Allow-Origin': '*'});
        base64Start = 'data:image/jpeg;base64,';
    }

    // if not cc-0 a valid author string is needed
    if ((typeof req.body.format !== "undefined") && (req.body.format==='base64')) {


      res.end(base64Start+img.toString('base64'));
      console.log("OK --> SEND BACK BASE64 IMAGE FILE '"+req.files.file.file+"'");

    } else {

      res.end(img, 'binary');
      console.log("OK --> SEND BACK BINARY IMAGE FILE '"+req.files.file.file+"'");s
    }


};

var cleanup = function(req, res, errMsg) {

    // delete uploaded file
    var tempFiles = "./uploads/" + req.files.file.uuid;
    try {
        deleteFolderRecursive(tempFiles);
        console.log("OK --> CLEAN UP TEMP FILES '"+tempFiles+"'");
    } catch(e) {
        console.log("FAIL --> CLEAN UP TEMP FILES '"+tempFiles+"'");
    }

    // final respond with error message
    if (typeof errMsg !== "undefined") {
        console.log("!! FAIL !!!!!!!!!!!!!!!!!!!!");
        console.log("ERROR MESSAGE: "+errMsg);
        res.status(500).send(errMsg);
    }

    console.log("** END ********************");

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

// return brightness (from 0=max-dark to 255=max-bright)
var getBrightnessFactorFromHexcode = function(hexCode) {
    hexCode = hexCode.replace('#', '');
    var r = parseInt(hexCode.substr(0, 2),16);
    var g = parseInt(hexCode.substr(2, 2),16);
    var b = parseInt(hexCode.substr(4, 2),16);
    return ((r * 299) + (g * 587) + (b * 114)) / 1000;
};

// check if string ends on a suffix
function stringEndsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}
