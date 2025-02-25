package main

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"log"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Time struct {
	CurrenTime string `json:"current_time"`
}

type User struct {
	Name     string
	User     string
	Password string
}

func main() {

	// Set client options
	clientOptions := options.Client().ApplyURI("mongodb://loyicadb:27017")

	// Connect to MongoDB
	client, err := mongo.Connect(context.TODO(), clientOptions)

	if err != nil {
		log.Fatal(err)
	}

	// Check the connection
	err = client.Ping(context.TODO(), nil)

	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Connected to MongoDB!")

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello from %q", html.EscapeString(r.URL.Path))
	})

	http.HandleFunc("/signUp", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			payload := make(map[string]interface{})
			err := json.NewDecoder(r.Body).Decode(&payload)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			name := payload["Name"]
			user := payload["User"]
			password := payload["Password"]
			user1 := User{name.(string), user.(string), password.(string)}
			usersCollection := client.Database("ChatRoomDB").Collection("User")
			insertResult, err := usersCollection.InsertOne(context.TODO(), user1)
			if err != nil {
				log.Fatal(err)
			} else {
				json.NewEncoder(w).Encode(insertResult.InsertedID)
			}
		}
	})

	http.HandleFunc("/time", func(w http.ResponseWriter, r *http.Request) {
		currentTime := []Time{
			{CurrenTime: time.Now().Format(http.TimeFormat)},
		}
		json.NewEncoder(w).Encode(currentTime)
	})

	fmt.Println("Server is running at localhost:8081")
	log.Fatal(http.ListenAndServe(":8081", nil))
}
