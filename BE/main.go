package main

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"log"
	"net/http"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/gorilla/websocket"
	"github.com/graphql-go/graphql"
	"github.com/graphql-go/handler"

	"github.com/rs/cors"
)

// User struct with BSON tags
type User struct {
	ID       primitive.ObjectID `bson:"_id,omitempty"`
	Name     string             `bson:"name"`
	User     string             `bson:"user"`
	Password string             `bson:"password"`
}

type Chatroom struct {
	ID    primitive.ObjectID   `bson:"_id,omitempty"`
	Name  string               `bson:"name"`
	Users []primitive.ObjectID `bson:"users"` // Store user IDs
}

type Message struct {
	ChatroomId  primitive.ObjectID `bson:"chatroomid"`
	UserId      primitive.ObjectID `bson:"userid"`
	Description string             `bson:"description"`
	Datetime    string             `bson:"datetime"`
}

type Time struct {
	CurrenTime string `json:"current_time"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var clients = make(map[*websocket.Conn]bool)
var mutex = sync.Mutex{}

func main() {
	// Set client options & connect to MongoDB
	clientOptions := options.Client().ApplyURI("mongodb://localhost:27017")
	// clientOptions := options.Client().ApplyURI("mongodb://loyicadb:27017")
	client, err := mongo.Connect(context.TODO(), clientOptions)
	if err != nil {
		log.Fatal(err)
	}

	// Check the MongoDB connection
	err = client.Ping(context.TODO(), nil)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Connected to MongoDB!")

	// Define Structs
	userType := graphql.NewObject(graphql.ObjectConfig{
		Name: "User",
		Fields: graphql.Fields{
			"id":   &graphql.Field{Type: graphql.String},
			"name": &graphql.Field{Type: graphql.String},
			"user": &graphql.Field{Type: graphql.String},
		},
	})

	chatroomType := graphql.NewObject(graphql.ObjectConfig{
		Name: "Chatroom",
		Fields: graphql.Fields{
			"id":   &graphql.Field{Type: graphql.String},
			"name": &graphql.Field{Type: graphql.String},
			"users": &graphql.Field{
				Type: graphql.NewList(graphql.String), // Return list of user IDs
			},
		},
	})

	messageType := graphql.NewObject(graphql.ObjectConfig{
		Name: "Message",
		Fields: graphql.Fields{
			"chatroomId":  &graphql.Field{Type: graphql.String},
			"userId":      &graphql.Field{Type: graphql.String},
			"description": &graphql.Field{Type: graphql.String},
			"datetime":    &graphql.Field{Type: graphql.DateTime},
		},
	})

	// Define a basic Query type
	queryType := graphql.NewObject(graphql.ObjectConfig{
		Name: "Query",
		Fields: graphql.Fields{
			"hello": &graphql.Field{
				Type: graphql.String,
				Resolve: func(params graphql.ResolveParams) (interface{}, error) {
					return "Hello, GraphQL!", nil
				},
			},
		},
	})

	// Define Mutation
	mutation := graphql.NewObject(graphql.ObjectConfig{
		Name: "Mutation",
		Fields: graphql.Fields{
			"signup": &graphql.Field{
				Type: userType, // Return user info (except password)
				Args: graphql.FieldConfigArgument{
					"name":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
					"user":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
					"password": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					name := p.Args["name"].(string)
					user := p.Args["user"].(string)
					password := p.Args["password"].(string)

					// Insert user into MongoDB
					newUser := User{Name: name, User: user, Password: password}
					usersCollection := client.Database("ChatRoomDB").Collection("User")
					_, err := usersCollection.InsertOne(context.TODO(), newUser)
					if err != nil {
						return nil, err
					}

					// Return user (excluding password)
					return map[string]string{"name": name, "user": user}, nil
				},
			},
			"getUsers": &graphql.Field{
				Type: graphql.NewList(userType), // Return user info (except password)
				Args: graphql.FieldConfigArgument{
					"user": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					user := p.Args["user"].(string)

					var users []User
					usersCollection := client.Database("ChatRoomDB").Collection("User")
					cursor, err := usersCollection.Find(context.TODO(), bson.M{"user": bson.M{"$ne": user}})
					if err != nil {
						return nil, err
					}

					defer cursor.Close(context.TODO())

					for cursor.Next(context.TODO()) {
						var user User
						cursor.Decode(&user)
						users = append(users, user)
					}

					return users, nil
				},
			},
			"login": &graphql.Field{
				Type: userType, // Return user info (except password)
				Args: graphql.FieldConfigArgument{
					"user":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
					"password": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					username := p.Args["user"].(string)
					password := p.Args["password"].(string)

					usersCollection := client.Database("ChatRoomDB").Collection("User")
					var foundUser User
					err := usersCollection.FindOne(context.TODO(), bson.M{"user": username}).Decode(&foundUser)

					if err != nil {
						return nil, fmt.Errorf("Invalid user or password")
					}

					if foundUser.Password != password {
						return nil, fmt.Errorf("Invalid user or password")
					}

					return map[string]string{"name": foundUser.Name, "user": foundUser.User}, nil
				},
			},
			"createChatroom": &graphql.Field{
				Type: chatroomType,
				Args: graphql.FieldConfigArgument{
					"name":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
					"users": &graphql.ArgumentConfig{Type: graphql.NewList(graphql.String)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					name := p.Args["name"].(string)
					users := []primitive.ObjectID{}

					if p.Args["users"] != nil {
						for _, userID := range p.Args["users"].([]interface{}) {
							objID, err := primitive.ObjectIDFromHex(userID.(string))
							if err != nil {
								return nil, err
							}
							users = append(users, objID)
						}
					}

					chatroom := Chatroom{Name: name, Users: users}
					chatroomsCollection := client.Database("ChatRoomDB").Collection("Chatroom")
					_, err := chatroomsCollection.InsertOne(context.TODO(), chatroom)
					if err != nil {
						return nil, err
					}

					return chatroom, nil
				},
			},
			"createMessage": &graphql.Field{
				Type: messageType,
				Args: graphql.FieldConfigArgument{
					"chatroomId":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
					"userId":      &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
					"description": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					chatroomId := p.Args["chatroomId"].(string)
					userId := p.Args["userId"].(string)
					description := p.Args["description"].(string)
					objChatroomID, err := primitive.ObjectIDFromHex(chatroomId)
					chatroomCollection := client.Database("ChatRoomDB").Collection("Chatroom")
					var foundChatmroom Chatroom
					err = chatroomCollection.FindOne(context.TODO(), bson.M{"_id": objChatroomID}).Decode(&foundChatmroom)
					if err != nil {
						return foundChatmroom, fmt.Errorf("Chatroom not found")
					}
					objUserID, err := primitive.ObjectIDFromHex(userId)
					usersCollection := client.Database("ChatRoomDB").Collection("User")
					var foundUser User
					err = usersCollection.FindOne(context.TODO(), bson.M{"_id": objUserID}).Decode(&foundUser)
					if err != nil {
						return nil, fmt.Errorf("User not found")
					}

					message := Message{ChatroomId: objChatroomID, UserId: objUserID, Description: description, Datetime: time.Now().Format(http.TimeFormat)}
					messageCollection := client.Database("ChatRoomDB").Collection("Message")
					_, err = messageCollection.InsertOne(context.TODO(), message)
					if err != nil {
						return nil, err
					}

					return message, nil
				},
			},
			"GetChatrooms": &graphql.Field{
				Type: graphql.NewList(chatroomType),
				Args: graphql.FieldConfigArgument{
					"userId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					userId := p.Args["userId"].(string)
					objUserID, err := primitive.ObjectIDFromHex(userId)
					usersCollection := client.Database("ChatRoomDB").Collection("User")
					var foundUser User
					err = usersCollection.FindOne(context.TODO(), bson.M{"_id": objUserID}).Decode(&foundUser)
					if err != nil {
						return nil, fmt.Errorf("User not found")
					}

					var chatrooms []Chatroom
					chatroomCollection := client.Database("ChatRoomDB").Collection("Chatroom")
					cursor, err := chatroomCollection.Find(context.TODO(), bson.M{"users": objUserID})
					if err != nil {
						return nil, err
					}
					defer cursor.Close(context.TODO())

					for cursor.Next(context.TODO()) {
						var chatroom Chatroom
						cursor.Decode(&chatroom)
						chatrooms = append(chatrooms, chatroom)
					}

					return chatrooms, nil
				},
			},
		},
	})

	// Define Schema
	schema, err := graphql.NewSchema(graphql.SchemaConfig{
		Query:    queryType,
		Mutation: mutation,
	})
	if err != nil {
		log.Fatalf("Failed to create schema: %v", err)
	}

	// Create GraphQL handler
	h := handler.New(&handler.Config{
		Schema:   &schema,
		Pretty:   true,
		GraphiQL: true, // Enable GraphiQL interface
	})

	// Wrap GraphQL handler with CORS middleware

	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"}, // Change to specific origins if needed
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}).Handler(h)

	http.Handle("/graphql", corsHandler)
	//WebSocket endpoint
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		chatroomID := r.URL.Query().Get("chatroomID")
		if chatroomID == "" {
			http.Error(w, "Chatroom ID required", http.StatusBadRequest)
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println("WebSocket upgrade error:", err)
			return
		}
		defer conn.Close()

		mutex.Lock()
		clients[conn] = true
		mutex.Unlock()

		//Websocket
		collection := client.Database("ChatRoomDB").Collection("message")
		pipeline := mongo.Pipeline{
			bson.D{{"$match", bson.D{{"fullDocument.chatroom_id", chatroomID}}}},
		}
		stream, err := collection.Watch(context.TODO(), pipeline)
		if err != nil {
			log.Println("Error watching MongoDB:", err)
			return
		}
		defer stream.Close(context.TODO())

		for stream.Next(context.TODO()) {
			var message bson.M
			if err := stream.Decode(&message); err != nil {
				log.Println("Error decoding message:", err)
				continue
			}

			mutex.Lock()
			for client := range clients {
				err := client.WriteJSON(message)
				if err != nil {
					log.Println("Error sending message:", err)
					client.Close()
					delete(clients, client)
				}
			}
			mutex.Unlock()
		}
	})

	// Basic HTTP handler
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello from %q", html.EscapeString(r.URL.Path))
	})

	http.HandleFunc("/time", func(w http.ResponseWriter, r *http.Request) {
		currentTime := []Time{
			{CurrenTime: time.Now().Format(http.TimeFormat)},
		}
		json.NewEncoder(w).Encode(currentTime)
	})

	fmt.Println("Server is running at http://localhost:8081")
	log.Fatal(http.ListenAndServe(":8081", nil))
}
