# ccstamper
a stateless web service adding creative commons meta data to images 
![alt tag](https://github.com/rootzoll/ccstamper/blob/master/static/ccstamper-idee.png?raw=true)

## Setup Locally

```
npm install
npm start
```

## Run from DockerHub

```
docker run -d --name ccstamper -p 3003:3003 rootzoll/ccstamper
```

## Build and Rund Docker Locally

```
docker build -t="rootzoll/ccstamper" .
docker run -d --name ccstamper -p 3003:3003 rootzoll/ccstamper
docker logs ccstamper -f
```


## ccstamper API v0.1

TODO
