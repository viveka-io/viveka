FROM ubuntu:12.04.5

RUN \
  apt-get install -y software-properties-common python-software-properties unzip && \
  echo oracle-java7-installer shared/accepted-oracle-license-v1-1 select true | debconf-set-selections && \
  add-apt-repository -y ppa:webupd8team/java && \
  apt-get update && \
  apt-get install -y oracle-java7-installer && \
  rm -rf /var/lib/apt/lists/* && \
  rm -rf /var/cache/oracle-jdk7-installer

RUN \
  mkdir -p /tmp/galen-install && \
  wget https://github.com/galenframework/galen/releases/download/galen-1.6.3/galen-bin-1.6.3.zip -O /tmp/galen-install/galen.zip && \
  unzip /tmp/galen-install/galen.zip -d /tmp/galen-install && \
  rm /tmp/galen-install/galen.zip
  
ENV PATH /tmp/galen-install/galen-bin-1.6.3:$PATH