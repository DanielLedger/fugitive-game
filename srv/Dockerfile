#A docker that sets up an nginx reverse proxy which uses SSL and hosts the server as well.
FROM nginx
#Copy the entire node server into the container (including a couple pointless things).
COPY . /opt/srv
#Install node v16 (as per https://github.com/nodesource/distributions/blob/master/README.md#deb)
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs

