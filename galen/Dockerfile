FROM selenium/standalone-firefox:2.46.0

RUN mkdir -p /tmp/galen-install \
    && wget https://github.com/galenframework/galen/releases/download/galen-1.6.3/galen-bin-1.6.3.zip -O /tmp/galen-install/galen.zip\
    && unzip /tmp/galen-install/galen.zip -d /tmp/galen-install \
    && rm /tmp/galen-install/galen.zip

WORKDIR /tmp/galen-install/galen-bin-1.6.3/
RUN sudo ./install.sh


