FROM node:0.12
RUN npm install bower -g
ADD package.json /opt/app-modules/package.json
RUN cd /opt/app-modules && npm install
#RUN cd /opt/app-modules && bower install --allow-root
