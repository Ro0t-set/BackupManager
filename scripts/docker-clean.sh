#!/bin/bash

# Clean up Docker containers, volumes, and images

echo "🧹 Cleaning up Docker resources..."

# Stop and remove containers
docker-compose down

# Remove volumes (backup data will be preserved in ./backups)
read -p "Remove Docker volumes? This will delete the database! (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose down -v
    echo "✅ Volumes removed"
fi

# Remove images
read -p "Remove Docker images? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose down --rmi all
    echo "✅ Images removed"
fi

# Prune system
read -p "Prune Docker system? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker system prune -f
    echo "✅ System pruned"
fi

echo "🎉 Cleanup complete!"
