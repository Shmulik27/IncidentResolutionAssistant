package models

import (
	"encoding/json"
	"io/ioutil"
	"os"
)

type User struct {
	Email string   `json:"email"`
	Name  string   `json:"name"`
	Roles []string `json:"roles"`
}

type Users struct {
	Users []User `json:"users"`
}

// LoadUsers loads users from a JSON file
func LoadUsers(filename string) ([]User, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	bytes, err := ioutil.ReadAll(file)
	if err != nil {
		return nil, err
	}
	var users Users
	err = json.Unmarshal(bytes, &users)
	if err != nil {
		return nil, err
	}
	return users.Users, nil
}

// SaveUsers saves users to a JSON file
func SaveUsers(filename string, users []User) error {
	data, err := json.MarshalIndent(Users{Users: users}, "", "  ")
	if err != nil {
		return err
	}
	return ioutil.WriteFile(filename, data, 0644)
}
