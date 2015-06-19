![alt-tag](http://viveka.io/viveka.png)

## What is Viveka?

Viveka is a visual regression testing tool, based on both image and DOM differences.
The system uses selenium-webdriver and mongoose.

## Prerequisites

On Linux you need git, [Docker](https://www.docker.com/) and [docker-compose](https://docs.docker.com/compose/).
On Windows and Mac you need git and [Vagrant](https://www.vagrantup.com/)

## Running with Docker

    git clone git@github.com:viveka-io/viveka.git
    cd viveka

Next command should be executed inside Docker enabled environment. On Windows and Mac you can run it using [vagrant-docker](https://github.com/mucsi96/vagrant-docker)

    docker-compose up

## Running without Docker

    git clone git@github.com:viveka-io/viveka.git
    cd viveka
    npm install
