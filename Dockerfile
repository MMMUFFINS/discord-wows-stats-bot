FROM node:carbon

# Create app directory
WORKDIR /usr/src/app

COPY ./src/package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm install --only=production

COPY ./src .

CMD [ "npm", "start" ]