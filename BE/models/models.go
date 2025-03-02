package models

import (
	"sync"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// struct with BSON tags
type User struct {
	ID       string `bson:"_id,omitempty"`
	Name     string `bson:"name"`
	User     string `bson:"user"`
	Password string `bson:"password"`
}

type Chatroom struct {
	ID    string   `bson:"_id,omitempty"`
	Name  string   `bson:"name"`
	Users []string `bson:"users"` // Store user IDs
}

type Message struct {
	ID           string             `bson:"_id,omitempty"`
	ChatroomId   primitive.ObjectID `bson:"chatroomid"`
	UserId       primitive.ObjectID `bson:"userid"`
	Description  string             `bson:"description"`
	Datetime     string             `bson:"datetime"`
	User         User               `bson:"user,omitempty"`
	Reaction     Reaction           `bson:"reaction,omitempty"`
	LikeCount    int64              `bson:"likeCount"`
	DislikeCount int64              `bson:"dislikeCount"`
}

type Reaction struct {
	ID        string `bson:"_id,omitempty"`
	MessageId string `bson:"messageid"`
	UserId    string `bson:"userid"`
	ReactType string `bson:"reactType"`
}

type Time struct {
	CurrenTime string `json:"current_time"`
}

// Define subsription struct
type SubscriptionManager struct {
	subscribers map[string][]chan *Message
	mu          sync.Mutex
}

// Define subscription manager
func NewSubscriptionManager() *SubscriptionManager {
	return &SubscriptionManager{
		subscribers: make(map[string][]chan *Message),
	}
}

// Define Subscribe for socket
func (m *SubscriptionManager) Subscribe(chatroomID string) <-chan *Message {
	m.mu.Lock()
	defer m.mu.Unlock()

	ch := make(chan *Message, 1)
	m.subscribers[chatroomID] = append(m.subscribers[chatroomID], ch)

	return ch
}

// Defin when publish message
func (m *SubscriptionManager) Publish(chatroomID string, msg *Message) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, ch := range m.subscribers[chatroomID] {
		ch <- msg
	}
}
