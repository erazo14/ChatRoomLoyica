# Chat Room Application

This is a real-time chat application built with **Golang**, **GraphQL**, and **MongoDB**, using **Docker Compose** for containerized deployment.

## Features
- Real-time chat functionality with **GraphQL Subscriptions**
- MongoDB for data storage
- Docker Compose for easy setup and deployment

## Prerequisites
Make sure you have the following installed:
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Setup and Running the Application

### 1. Clone the Repository
```sh
 git clone https://github.com/erazo14/ChatRoomLoyica.git
 cd ChatRoomLoyica
```

### 2. Set Up Environment Variables
Create a `.env.local` file in the FE/ directory and configure the environment variables:
```sh
NEXT_PUBLIC_URL_API=http://localhost:8081/graphql
NEXT_PUBLIC_URL_WS=ws://localhost:8081/ws
```

Do you want to run localy the projet need to modify the Backeng line on `BE/main.go` the following varaible on line 30:

```sh
var uriDB = "mongodb://localhost:27017" //execute localhost
var uriDB = "mongodb://loyicadb:27017" //execute on docker
```

> **Note:** Ensure the `.env.local` and `main.go` file is updated before running Docker.

### 3. Build and Run with Docker Compose
To build and start the application, run:
```sh
docker-compose up --build
```

To run in detached mode:
```sh
docker-compose up -d --build
```

### 4. Access the Application
- GraphQL Playground: [http://localhost:8080/graphql](http://localhost:8080/graphql)
- API runs on `http://localhost:8080`

## Stopping the Application
To stop the running containers:
```sh
docker-compose down
```

## Troubleshooting
If your `.env.local` changes are not reflected in Docker, try removing the containers and volumes:
```sh
docker-compose down --volumes --remove-orphans
docker-compose up --build
```

## License
This project is licensed under the [MIT License](LICENSE).

