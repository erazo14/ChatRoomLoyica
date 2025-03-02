package main

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/graphql-go/graphql"
	"github.com/graphql-go/handler"

	"crypto/sha256"
	"encoding/hex"

	"github.com/rs/cors"

	"loyicabe/models"
)

// Define enviorment Varaibles
var uriDB = "mongodb://localhost:27017" //execute localhost
// var uriDB = "mongodb://loyicadb:27017" //executo on docker

var DB_Name = "ChatRoomDB"
var clientOptions *options.ClientOptions
var client *mongo.Client

// Initialize Monogo Conection
func initMongo() {
	// Set client options & connect to MongoDB
	clientOptions = options.Client().ApplyURI(uriDB)
	var err error
	client, err = mongo.Connect(context.TODO(), clientOptions)
	if err != nil {
		log.Fatal(err)
	}

	// Check the MongoDB connection
	err = client.Ping(context.TODO(), nil)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Connected to MongoDB!")
}

var subManager = models.NewSubscriptionManager()

// define upgrader websocket
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Failed to upgrade:", err)
		return
	}
	defer conn.Close()

	chatroomID := r.URL.Query().Get("chatroomID")
	if chatroomID == "" {
		log.Println("Missing chatroomID")
		return
	}

	messageChannel := subManager.Subscribe(chatroomID)

	for msg := range messageChannel {
		if err := conn.WriteJSON(msg); err != nil {
			log.Println("WebSocket write error:", err)
			break
		}
	}
}

func hashString(input string) string {
	hasher := sha256.New()
	hasher.Write([]byte(input))
	return hex.EncodeToString(hasher.Sum(nil))
}

func main() {
	initMongo()

	// Define Structs
	userType := graphql.NewObject(graphql.ObjectConfig{
		Name: "User",
		Fields: graphql.Fields{
			"id":   &graphql.Field{Type: graphql.String},
			"Name": &graphql.Field{Type: graphql.String},
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

	reactionType := graphql.NewObject(graphql.ObjectConfig{
		Name: "Reaction",
		Fields: graphql.Fields{
			"Id":        &graphql.Field{Type: graphql.String},
			"MessageId": &graphql.Field{Type: graphql.String},
			"UserId":    &graphql.Field{Type: graphql.String},
			"ReactType": &graphql.Field{Type: graphql.String},
		},
	})

	messageType := graphql.NewObject(graphql.ObjectConfig{
		Name: "Message",
		Fields: graphql.Fields{
			"ID":          &graphql.Field{Type: graphql.String},
			"ChatroomId":  &graphql.Field{Type: graphql.String},
			"UserId":      &graphql.Field{Type: graphql.String},
			"Description": &graphql.Field{Type: graphql.String},
			"DateTime":    &graphql.Field{Type: graphql.DateTime},
			"User":        &graphql.Field{Type: userType},
			"Reaction":    &graphql.Field{Type: reactionType},
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
					newUser := models.User{Name: name, User: user, Password: hashString(password)}
					usersCollection := client.Database(DB_Name).Collection("User")
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

					var users []models.User
					usersCollection := client.Database(DB_Name).Collection("User")
					cursor, err := usersCollection.Find(context.TODO(), bson.M{"user": bson.M{"$ne": user}})
					if err != nil {
						return nil, err
					}

					defer cursor.Close(context.TODO())

					for cursor.Next(context.TODO()) {
						var user models.User
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

					usersCollection := client.Database(DB_Name).Collection("User")
					var foundUser models.User
					err := usersCollection.FindOne(context.TODO(), bson.M{"user": username}).Decode(&foundUser)

					if err != nil {
						return nil, fmt.Errorf("Invalid user or password")
					}

					if foundUser.Password != hashString(password) {
						return nil, fmt.Errorf("Invalid user or password")
					}

					return foundUser, nil
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
					users := []string{}

					if p.Args["users"] != nil {
						for _, userID := range p.Args["users"].([]interface{}) {
							objID, err := primitive.ObjectIDFromHex(userID.(string))
							if err != nil {
								return nil, err
							}
							users = append(users, objID.Hex())
						}
					}

					chatroom := models.Chatroom{Name: name, Users: users}
					chatroomsCollection := client.Database(DB_Name).Collection("Chatroom")
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
					objUserID, err := primitive.ObjectIDFromHex(userId)

					// validate if chatroom exist
					var foundChatmroom models.Chatroom
					chatroomCollection := client.Database(DB_Name).Collection("Chatroom")
					err = chatroomCollection.FindOne(context.TODO(), bson.M{"_id": objChatroomID}).Decode(&foundChatmroom)
					if err != nil {
						return foundChatmroom, fmt.Errorf("Chatroom not found")
					}
					// validate if user exist
					var foundUser models.User
					usersCollection := client.Database(DB_Name).Collection("User")
					err = usersCollection.FindOne(context.TODO(), bson.M{"_id": objUserID}).Decode(&foundUser)
					if err != nil {
						return nil, fmt.Errorf("User not found")
					}

					message := models.Message{ChatroomId: objChatroomID, UserId: objUserID, Description: description, Datetime: time.Now().Format(http.TimeFormat)}
					messageCollection := client.Database(DB_Name).Collection("Message")
					result, err := messageCollection.InsertOne(context.TODO(), message)
					if err != nil {
						return nil, err
					}
					insertedID := result.InsertedID.(primitive.ObjectID).Hex()
					message.ID = insertedID
					message.User = foundUser
					subManager.Publish(chatroomId, &message)
					return message, nil
				},
			},
			"allChatrooms": &graphql.Field{
				Type: graphql.NewList(chatroomType),
				Args: graphql.FieldConfigArgument{},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					var chatrooms []models.Chatroom
					chatroomCollection := client.Database(DB_Name).Collection("Chatroom")
					cursor, err := chatroomCollection.Find(context.TODO(), bson.M{})
					if err != nil {
						return nil, err
					}
					defer cursor.Close(context.TODO())

					for cursor.Next(context.TODO()) {
						var chatroom models.Chatroom
						cursor.Decode(&chatroom)
						objChatroomID, err := primitive.ObjectIDFromHex(chatroom.ID)
						if err != nil {
							return nil, err
						}
						chatroom.ID = objChatroomID.Hex()
						chatrooms = append(chatrooms, chatroom)
					}

					return chatrooms, nil
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
					usersCollection := client.Database(DB_Name).Collection("User")
					var foundUser models.User
					err = usersCollection.FindOne(context.TODO(), bson.M{"_id": objUserID}).Decode(&foundUser)
					if err != nil {
						return nil, fmt.Errorf("User not found")
					}
					var chatrooms []models.Chatroom
					chatroomCollection := client.Database(DB_Name).Collection("Chatroom")
					cursor, err := chatroomCollection.Find(context.TODO(), bson.M{"users": userId})
					if err != nil {
						return nil, err
					}
					defer cursor.Close(context.TODO())

					for cursor.Next(context.TODO()) {
						var chatroom models.Chatroom
						cursor.Decode(&chatroom)
						objChatroomID, err := primitive.ObjectIDFromHex(chatroom.ID)
						if err != nil {
							return nil, err
						}
						chatroom.ID = objChatroomID.Hex()
						chatrooms = append(chatrooms, chatroom)
					}

					return chatrooms, nil
				},
			},
			"subscribeChatrooms": &graphql.Field{
				Type: chatroomType,
				Args: graphql.FieldConfigArgument{
					"chatroomId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
					"userId":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					chatroomId, _ := p.Args["chatroomId"].(string)
					userId, _ := p.Args["userId"].(string)
					objChatroomID, err := primitive.ObjectIDFromHex(chatroomId)
					if err != nil {
						return nil, fmt.Errorf("Invalid chatroom ID format: %v", err)
					}
					objUserID, err := primitive.ObjectIDFromHex(userId)
					if err != nil {
						return nil, fmt.Errorf("Invalid user ID format: %v", err)
					}
					usersCollection := client.Database(DB_Name).Collection("User")
					var foundUser models.User
					err = usersCollection.FindOne(context.TODO(), bson.M{"_id": objUserID}).Decode(&foundUser)
					if err != nil {
						return nil, fmt.Errorf("User not found")
					}
					chatroomCollection := client.Database(DB_Name).Collection("Chatroom")
					var chatroom models.Chatroom
					err = chatroomCollection.FindOne(context.TODO(), bson.M{"_id": objChatroomID}).Decode(&chatroom)
					if err != nil {
						return nil, fmt.Errorf("Chatroom not found")
					}

					update := bson.M{"$addToSet": bson.M{"users": foundUser.ID}}
					_, err = chatroomCollection.UpdateByID(context.TODO(), objChatroomID, update)
					if err != nil {
						return nil, fmt.Errorf("Chatroom error updating", err)
					}

					err = chatroomCollection.FindOne(context.TODO(), bson.M{"_id": objChatroomID}).Decode(&chatroom)
					if err != nil {
						return nil, fmt.Errorf("Failed to fetch updated chatroom")
					}
					return chatroom, nil
				},
			},
			"GetMessages": &graphql.Field{
				Type: graphql.NewList(messageType),
				Args: graphql.FieldConfigArgument{
					"chatroomId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
					"userId":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					chatroomId := p.Args["chatroomId"].(string)
					userId := p.Args["userId"].(string)

					objChatroomID, err := primitive.ObjectIDFromHex(chatroomId)
					if err != nil {
						return nil, fmt.Errorf("Invalid chatroomId format")
					}

					var messages []map[string]interface{}
					messageCollection := client.Database(DB_Name).Collection("Message")
					cursor, err := messageCollection.Find(context.TODO(), bson.M{"chatroomid": objChatroomID})
					if err != nil {
						return nil, err
					}
					defer cursor.Close(context.TODO())

					for cursor.Next(context.TODO()) {
						var message models.Message
						cursor.Decode(&message)

						userCollection := client.Database(DB_Name).Collection("User")
						var user models.User
						err := userCollection.FindOne(context.TODO(), bson.M{"_id": message.UserId}).Decode(&user)
						if err != nil {
							return nil, fmt.Errorf("User not found for message with ID: %v", message.UserId)
						}

						reacionCollection := client.Database(DB_Name).Collection("Reaction")
						var reaction models.Reaction
						err = reacionCollection.FindOne(context.TODO(), bson.M{
							"messageid": message.ID,
							"userid":    userId,
						}).Decode(&reaction)

						message.User = user
						message.Reaction = reaction
						newMessage := map[string]interface{}{
							"ID":          message.ID,
							"Description": message.Description,
							"UserId":      user.ID,
							"User": map[string]string{
								"Name": user.Name,
							},
							"Reaction": map[string]string{
								"ReactType": reaction.ReactType,
							},
						}
						messages = append(messages, newMessage)
					}

					return messages, nil
				},
			},
			"reactMessage": &graphql.Field{
				Type: reactionType,
				Args: graphql.FieldConfigArgument{
					"messageId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
					"userId":    &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
					"reactType": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					messageId := p.Args["messageId"].(string)
					userId := p.Args["userId"].(string)
					reactType := p.Args["reactType"].(string)
					messageObjID, err := primitive.ObjectIDFromHex(messageId)
					if err != nil {
						return nil, fmt.Errorf("Invalid message Id format")
					}
					userObjID, err := primitive.ObjectIDFromHex(userId)
					if err != nil {
						return nil, fmt.Errorf("Invalid user Id format")
					}

					reactionCollection := client.Database(DB_Name).Collection("Reaction")

					var reaction models.Reaction
					err = reactionCollection.FindOne(context.TODO(), bson.M{
						"messageid": messageObjID.Hex(),
						"userid":    userObjID.Hex(),
					}).Decode(&reaction)

					if err != nil {
						if err == mongo.ErrNoDocuments {
							reaction = models.Reaction{
								MessageId: messageObjID.Hex(),
								UserId:    userObjID.Hex(),
								ReactType: reactType,
							}

							_, err = reactionCollection.InsertOne(context.TODO(), reaction)
							if err != nil {
								return nil, fmt.Errorf("Error inserting new reaction: %v", err)
							}
						}
					} else {
						update := bson.M{"$set": bson.M{"reactType": reactType}}
						reactionObjID, err := primitive.ObjectIDFromHex(reaction.ID)
						_, err = reactionCollection.UpdateByID(context.TODO(), reactionObjID, update)
						if err != nil {
							return nil, fmt.Errorf("Error updating reaction: %v", err)
						}

						err = reactionCollection.FindOne(context.TODO(), bson.M{"_id": reactionObjID}).Decode(&reaction)
						if err != nil {
							return nil, fmt.Errorf("Error retrieving updated reaction: %v", err)
						}
					}

					return reaction, nil
				},
			},
		},
	})

	//Define Subscription
	subscriptionType := graphql.NewObject(graphql.ObjectConfig{
		Name: "Subscription",
		Fields: graphql.Fields{
			"messageAdded": &graphql.Field{
				Type: messageType,
				Args: graphql.FieldConfigArgument{
					"chatroomId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				},
				Resolve: func(p graphql.ResolveParams) (interface{}, error) {
					return nil, nil // This will be handled separately
				},
			},
		},
	})

	// Define Schema
	schema, err := graphql.NewSchema(graphql.SchemaConfig{
		Query:        queryType,
		Mutation:     mutation,
		Subscription: subscriptionType,
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
	http.HandleFunc("/ws", handleWebSocket)

	// Basic HTTP handler
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello from %q", html.EscapeString(r.URL.Path))
	})

	http.HandleFunc("/time", func(w http.ResponseWriter, r *http.Request) {
		currentTime := []models.Time{
			{CurrenTime: time.Now().Format(http.TimeFormat)},
		}
		json.NewEncoder(w).Encode(currentTime)
	})

	fmt.Println("Server is running at http://localhost:8081")
	log.Fatal(http.ListenAndServe(":8081", nil))
}
