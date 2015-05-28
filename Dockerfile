FROM node:0.12
RUN npm install bower -g
RUN npm install nodemon -g
ADD package.json /opt/app-modules/package.json
ADD bower.json /opt/app-modules/bower.json
RUN cd /opt/app-modules && npm install
RUN cd /opt/app-modules && bower install --allow-root
