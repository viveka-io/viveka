FROM node:0.12
RUN npm install bower -g
RUN npm install nodemon -g

ADD viveka-difference-tool/package.json /opt/viveka-modules/package.json
RUN cd /opt/viveka-modules && npm install

ADD viveka-fingerprint-generator/package.json /opt/viveka-modules/package.json
RUN cd /opt/viveka-modules && npm install

ADD package.json /opt/viveka-modules/package.json
ADD bower.json /opt/viveka-modules/bower.json
RUN cd /opt/viveka-modules && npm install
RUN cd /opt/viveka-modules && bower install --allow-root
