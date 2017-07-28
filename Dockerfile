FROM saibabanadh/opencv-imagemagick-nodejs:latest

# create a new user
RUN useradd --user-group --create-home --shell /bin/false app

# create directory structure
ENV HOME=/home/app
ADD ./package.json $HOME/package.json
ADD ./static $HOME/static
ADD ./service.js $HOME/service.js
ADD ./watermark.js $HOME/watermark.js

# create upload folder
RUN mkdir $HOME/uploads && chmod 777 $HOME/uploads

ENV NODE_PATH=$HOME/node_modules

# install exiftool
RUN sudo apt-get -q -y install libimage-exiftool-perl perl-doc

RUN chown -R app:app $HOME/*

#Change to the new user
USER app
WORKDIR $HOME
RUN npm install
CMD ["node", "./service.js"]