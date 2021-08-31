#A docker that sets up an nginx reverse proxy which uses SSL and hosts the server as well.
FROM nginx
#Copy the entire node server into the container (including a couple pointless things).
COPY . /opt/srv
#Install node v16 (as per https://github.com/nodesource/distributions/blob/master/README.md#deb)
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs
#Copy the pregenerated SSL certificates.
COPY certs /etc/nginx
#Copy the config
COPY nginx-ssl-conf.conf /etc/nginx/conf.d
#Set our nodejs to run on container start.
RUN echo 'cd /opt/srv; ./index.js &' > /docker-entrypoint.d/40-run-node-srv.sh
RUN chmod +x /docker-entrypoint.d/40-run-node-srv.sh
