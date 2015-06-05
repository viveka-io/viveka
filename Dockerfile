FROM node:0.12

RUN npm install -g bower
RUN npm install -g nodemon
RUN npm install -g bunyan

ADD package.json /opt/viveka-modules/package.json
RUN cd /opt/viveka-modules && npm install

ADD bower.json /opt/viveka-modules/bower.json
RUN cd /opt/viveka-modules && bower install --allow-root
