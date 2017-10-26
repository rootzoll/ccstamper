import { Component } from '@angular/core';
import { Ng2FileDropAcceptedFile, Ng2FileDropRejectedFile } from 'ng2-file-drop';
import { Http } from '@angular/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  step = 1;

  images : Array<any> = new Array<any>();
  license : string = 'cc-by';
  author: string = 'test';

  uploadProgress : number = 1;

  constructor(public http: Http) {
  }

  buttonLicense() {
    this.step = 3;
  }

  buttonAuthor() {
    //alert('TODO: now stamp license('+this.license+') author('+this.author+')');
    this.stampImages();
  }

  buttonDownload(image) : void {
    alert('TODO');
  }

  buttonDownloadZip() {
    alert("TODO: check JSZip");
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

  stampImages() : void {

    this.step = 4;

    this.images.forEach((image) => {

      let formData = new FormData();
      formData.append('file', image);
      formData.append('license', this.license);
      formData.append('by', this.author);
      formData.append('format', 'base64');
      let req = new XMLHttpRequest();

      req.onreadystatechange = function() {
        if (req.readyState == 4) {
          image.dataURL = req.responseText;
        }
      };

      req.upload.addEventListener("progress", (event) => {
        if (typeof event !== "undefined") {
          if ((typeof event.total !== "undefined") && (typeof event.loaded !== "undefined")) {
            try {
              this.uploadProgress = Math.round((event.loaded / event.total) * 100);
            } catch (e) { console.log("E:"); }
          }
        }
      });

      req.open('POST','./stamp');
      //req.open('POST','http://localhost:3006/stamp');
      req.send(formData);

    });

    this.step=5;

  };

}
