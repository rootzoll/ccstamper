import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {HttpModule} from '@angular/http';

// UI components: https://material.angular.io/components
import {MdButtonModule, MdCheckboxModule, MdProgressBarModule} from '@angular/material';

// File Drag+Drop: https://github.com/leewinder/ng2-file-drop
import { Ng2FileDropModule } from 'ng2-file-drop';

// Local Modules
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    MdButtonModule,
    FormsModule,
    HttpModule,
    MdCheckboxModule,
    MdProgressBarModule,
    Ng2FileDropModule
  ],
  exports: [
    MdButtonModule,
    MdCheckboxModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }


