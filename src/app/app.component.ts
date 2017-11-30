import { Component } from '@angular/core';
import { Ng2FileDropAcceptedFile, Ng2FileDropRejectedFile } from 'ng2-file-drop';
import { Http } from '@angular/http';
import * as JSZip from 'jszip';
import * as filesaver from 'file-saver';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  step = 1;
  stamperY: number = 5;

  images : Array<any> = new Array<any>();
  license : string = 'cc-by';
  author: string = 'test';

  uploadProgress : number = 1;

  downloadImage: any = {
    dataURL: '',
    name :''
  };

  constructor(public http: Http) {
  }

  reset() : void {
    location.reload();
  }

  buttonLicense() {
    if (this.license==="cc-0") {
      this.author = "";
      this.buttonAuthor();
    } else {
      this.step = 3;
    }
  }

  buttonAuthor() {
    this.step = 4;
    this.stampImages(0);
  }

  // let user download a single image
  buttonDownload(image:any,  dynamicDownload:any) : void {
    fetch(image.dataURL)
      .then(res => res.blob())
      .then(blob => {
        console.log(blob);
        filesaver.saveAs(blob, image.newName);
      });
  }

  animationStamperDown(callbackWhenDone) : void {
    if (this.stamperY>=280) {
      callbackWhenDone();
      return;
    }
    this.stamperY = this.stamperY + 2;
    setTimeout(()=>{
      this.animationStamperDown(callbackWhenDone);
    },4);
  }

  animationStamperUp(callbackWhenDone) : void {
    if (this.stamperY<=5) {
      callbackWhenDone();
      return;
    }
    this.stamperY = this.stamperY - 2;
    setTimeout(()=>{
      this.animationStamperUp(callbackWhenDone);
    },4);
  }

  buttonDownloadZip() {
    let zipFile: JSZip = new JSZip();
    this.images.forEach((img) => {
      zipFile.file(img.name, img.dataURL.substring(img.dataURL.indexOf(',')), {base64: true});
    });
    zipFile.generateAsync({type:"blob"})
      .then(function(content) {
        filesaver.saveAs(content, "ccstamper-"+(Date.now())+".zip");
      });
  }

  // results from choosing files manually
  manualChooseFile(event) {

    if (this.step > 1) { return; }

    for (let i=0; i<event.target.files.length; i++) {
      this.images.push(event.target.files[i]);
    }

    this.processImagesForPreview();

    this.step = 2;
  }

  // Files being dragged has been dropped and is valid
  private dragFileAccepted(acceptedFile: Ng2FileDropAcceptedFile) {

    console.log("FILE",acceptedFile);

    // block file drops during upload or on multiple files
    if (this.step > 1) { return; }
    this.step = 2;

  }

  // File being dragged has been dropped and has been rejected
  private dragFileRejected(rejectedFile: Ng2FileDropRejectedFile) {
    console.log('TODO: dragFileRejected', rejectedFile);
  }

  private processImagesForPreview () {
    this.images.forEach((image) => {

      let file:File = image;
      let myReader:FileReader = new FileReader();
      myReader.onloadend = (e) => {
        image.dataURL = myReader.result;
      };
      myReader.readAsDataURL(file);

    });
  }

  addLicenseIntoFilename(filename:string, license:string) : string {
    if (filename.indexOf('.')<=0) return filename;
    return filename.substring(0,filename.lastIndexOf('.'))
      + ' (' + license + ')'
      + filename.substring(filename.lastIndexOf('.'));
  }

  stampImages(index: number) : void {

    // check if done
    if (index>=this.images.length) {
      this.step = 5;
      return;
    }

    // get the image needed
    let image = this.images[0];

    this.animationStamperDown(()=>{

      let formData = new FormData();
      formData.append('file', image);
      formData.append('license', this.license);
      formData.append('by', this.author);
      formData.append('format', 'base64');
      let req = new XMLHttpRequest();

      req.onreadystatechange = () => {
        if (req.readyState == 4) {

          image.dataURL = req.responseText;

          let licenseString = this.license.toLocaleUpperCase()+' 4.0';
          // TODO: add author later if we can be sure that all filename critical chars are removed
          // if (this.license.indexOf('by')>0) licenseString = licenseString + ' by '+this.author.replace('.','_');
          image.newName = this.addLicenseIntoFilename(image.name, licenseString);

          setTimeout(()=>{
            this.animationStamperUp(()=>{

              // rotate images
              this.images.push(this.images.shift());

              // next image
              this.stampImages(index+1);

            });
          },500);

        }
      };

      req.upload.addEventListener("progress", (event) => {
        if (typeof event !== "undefined") {
          if ((typeof event.total != "undefined") && (typeof event.loaded != "undefined")) {
            try {
              this.uploadProgress = Math.round(((index) / this.images.length) * 100) + Math.round((event.loaded / event.total) * 100 * (1.0 / this.images.length));
            } catch (e) { console.log("E:"); }
          }
        }
      });

      req.open('POST','./stamp');
      //req.open('POST','http://localhost:3006/stamp');
      req.send(formData);

    });


  };

}
