package main

import (
	"context"
	"fmt"
	"html"
	"log"
	"net/http"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/graphql-go/graphql"
	"github.com/graphql-go/handler"
)

// User struct with BSON tags
type User struct {
	Name     string `bson:"name"`
	User     string `bson:"user"`
	Password string `bson:"password"`
}

func main() {
	// Set client options & connect to MongoDB
	clientOptions := options.Client().ApplyURI("mongodb://localhost:27017")
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

	// Define User Type
	userType := graphql.NewObject(graphql.ObjectConfig{
		Name: "User",
		Fields: graphql.Fields{
			"name": &graphql.Field{Type: graphql.String},
			"user": &graphql.Field{Type: graphql.String},
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

	http.Handle("/graphql", h)

	// Basic HTTP handler
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello from %q", html.EscapeString(r.URL.Path))
	})

	fmt.Println("Server is running at http://localhost:8081")
	log.Fatal(http.ListenAndServe(":8081", nil))
}
