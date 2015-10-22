![alt-tag](http://viveka.io/viveka.png)

# What is Viveka?

Viveka is a visual regression testing tool, based on both image and DOM differences.
The system can make a "fingerprint" on a webpage at any time and can show differences
between these states.

## Running Viveka

### Repository

First, clone Viveka:

    git clone git@github.com:viveka-io/viveka.git

### Database

We are using MongoDB for storing data. We are planning to add more DB interface later.
To get MongoDB locally, visit [their website](https://www.mongodb.org/) and follow the instructions.
Viveka will try to use it on the default port (27017).

If you want to use a MongoDB service somewhere else, set the path variable (DB_URI) to the url where
you can reach the DB instance.
For example:

    mongodb://user:pass@mongodb.url:port/viveka

The original url we try to use is:

    mongodb://localhost:27017/viveka

### Environment

Viveka was written in NodeJS, so visit [their website](https://nodejs.org/en/) if you don't have it.
If you have NodeJS installed, then you should install [bower](http://bower.io/) and [gulp](http://gulpjs.com/)
This can be done with:

    npm install -g bower gulp

### Running
    npm install
    bower install // "npm install" should run this anyway!
    npm start // or "gulp"

Make sure your MongoDB connection is working!

### Browsers

To run your tests on different browsers, you have to install them first and some of them needs additional drivers. [LIST](http://www.seleniumhq.org/download/)

* Firefox can be used without additional drivers (if you installed it already)
* Chrome needs [ChromeDriver](https://sites.google.com/a/chromium.org/chromedriver/)
    * [Download it](https://sites.google.com/a/chromium.org/chromedriver/downloads)
    * Put it somewhere
    * And add the folder to your PATH
* IE needs [IEDriver](https://code.google.com/p/selenium/wiki/InternetExplorerDriver)
    * [Download it](http://selenium-release.storage.googleapis.com/index.html)
    * Put it somewhere
    * And add the folder to your PATH
* Safari needs [SafariDriver](https://code.google.com/p/selenium/wiki/SafariDriver)
    * [Download it](http://selenium-release.storage.googleapis.com/2.45/SafariDriver.safariextz) (v2.45)
    * Install as an extension to Safari
* PhantomJS needs [PhantomJS](http://phantomjs.org/)
    * [Download it](http://phantomjs.org/download.html)
    * Put it somewhere
    * And add the folder to your PATH

### Comments

For the user interface we are using [Material Design Lite](https://github.com/google/material-design-lite)
