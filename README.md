# viveka

## Prerequisites

On Linux you need git, [Docker](https://www.docker.com/) and [docker-compose](https://docs.docker.com/compose/).
On Windows and Mac you need git and [Vagrant](https://www.vagrantup.com/)

## Running

    git clone git@github.com:viveka-io/viveka.git
    cd viveka
    git submodule foreach git pull

Next command should be executed inside Docker enabled environment. On Windows and Mac you can run it using [vagrant-docker](https://github.com/mucsi96/vagrant-docker)

    docker-compose up
