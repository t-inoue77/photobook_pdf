#!/bin/bash

echo "Setting up photobook_pdf project..."

# Check if node_modules already exists
if [ -d "node_modules" ]; then
    echo "node_modules directory already exists. Skipping extraction."
else
    echo "Extracting node_modules archives..."
    
    # Extract all node_modules parts
    for file in node_modules_part*.tar.gz; do
        if [ -f "$file" ]; then
            echo "Extracting $file..."
            tar -xzf "$file"
        fi
    done
    
    echo "node_modules extraction complete!"
fi

# Install any missing dependencies
echo "Running npm install to ensure all dependencies are up to date..."
npm install

echo "Setup complete! You can now run 'npm start' to start the development server."