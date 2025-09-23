#!/bin/bash

echo "Clearing Next.js cache..."

# Remove .next directory
if [ -d ".next" ]; then
    rm -rf .next
    echo "Removed .next directory"
fi

# Remove node_modules/.cache if it exists
if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    echo "Removed node_modules/.cache"
fi

echo "Cache cleared! You may need to restart your development server."


