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
docker run -d --name ccstamper -p 3006:3006 rootzoll/ccstamper
docker logs ccstamper -f
```

## Build and Run Docker Locally

```
docker build -t="rootzoll/ccstamper" .
docker run -d --name ccstamper -p 3006:3006 rootzoll/ccstamper
docker logs ccstamper -f
```

## ccstamper API v0.1

Run Docker container locally and open in browser to see API live doc
```
http://localhost:3006
```
