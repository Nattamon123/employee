package main

import (
	"log"

	"github.com/Nattamon123/employee/backend/internal/config"
	"github.com/Nattamon123/employee/backend/internal/server"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	srv, err := server.New(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize server: %v", err)
	}

	log.Printf("NexHR API starting on port %s", cfg.Port)
	if err := srv.Run(); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
