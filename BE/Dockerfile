# #Base IMage Golang 1.19.2 Bullseye
FROM golang:1.19.2-bullseye
# # Creat /app directory within the image to hold our application source code
WORKDIR /app
# # we copy everything in teh root directory into our /app directory
COPY  . .
# # Install dependencies
RUN  go mod download
# # Build the app with optional configuration
RUN go build -o /godocker
# # Tells Docker that the container listens on specified network ports at runtime
EXPOSE 8080 
# # command to be used to execute when the image is used to start a container
CMD [ "/godocker" ]