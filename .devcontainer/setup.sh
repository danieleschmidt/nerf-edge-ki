#!/bin/bash

# NeRF Edge Kit - Development Environment Setup Script
set -e

echo "🚀 Setting up NeRF Edge Kit development environment..."

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
fi

if [ -f "requirements-dev.txt" ]; then
    pip install -r requirements-dev.txt
fi

# Install additional Python packages for NeRF development
echo "🔬 Installing NeRF-specific Python packages..."
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install numpy opencv-python pillow matplotlib plotly jupyter

# Install PyTorch3D (CPU version for development)
echo "📐 Installing PyTorch3D..."
pip install pytorch3d -f https://dl.fbaipublicfiles.com/pytorch3d/packaging/wheels/py39_cu113_pyt1110/download.html || echo "⚠️  PyTorch3D installation failed, continuing..."

# Setup Git configuration
echo "⚙️  Configuring Git..."
git config --global --add safe.directory /workspace
git config --global init.defaultBranch main

# Create necessary directories
echo "📁 Creating project directories..."
mkdir -p .cache/models
mkdir -p .cache/textures
mkdir -p .cache/scenes
mkdir -p logs
mkdir -p tmp

# Setup pre-commit hooks
echo "🪝 Setting up pre-commit hooks..."
npm run prepare || echo "⚠️  Pre-commit setup failed, continuing..."

# Install Jupyter extensions
echo "📓 Setting up Jupyter..."
jupyter labextension install @jupyter-widgets/jupyterlab-manager || echo "⚠️  Jupyter extension installation failed"

# Create development configuration files
echo "⚙️  Creating development configuration..."

# Create .vscode/settings.json if not exists
mkdir -p .vscode
if [ ! -f ".vscode/settings.json" ]; then
    cat > .vscode/settings.json << 'EOF'
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true,
    "**/coverage": true,
    "**/.nyc_output": true,
    "**/.cache": true
  },
  "python.defaultInterpreterPath": "/usr/local/bin/python",
  "python.formatting.provider": "black",
  "python.linting.enabled": true,
  "python.linting.flake8Enabled": true,
  "python.testing.pytestEnabled": true,
  "python.testing.unittestEnabled": false,
  "python.testing.pytestPath": "pytest",
  "terminal.integrated.defaultProfile.linux": "bash",
  "workbench.colorTheme": "Dark+ (default dark)",
  "git.autofetch": true,
  "extensions.ignoreRecommendations": false
}
EOF
fi

# Create .vscode/launch.json for debugging
if [ ! -f ".vscode/launch.json" ]; then
    cat > .vscode/launch.json << 'EOF'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Web App",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/webpack-dev-server",
      "args": ["--mode", "development"],
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "nerf:*"
      }
    },
    {
      "name": "Debug Python Script",
      "type": "python",
      "request": "launch",
      "program": "${file}",
      "console": "integratedTerminal",
      "env": {
        "PYTHONPATH": "${workspaceFolder}/python"
      }
    },
    {
      "name": "Run Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "test"
      }
    }
  ]
}
EOF
fi

# Create .vscode/tasks.json for common tasks
if [ ! -f ".vscode/tasks.json" ]; then
    cat > .vscode/tasks.json << 'EOF'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build",
      "type": "shell",
      "command": "npm run build",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared",
        "showReuseMessage": true,
        "clear": false
      },
      "problemMatcher": ["$tsc"]
    },
    {
      "label": "Test",
      "type": "shell",
      "command": "npm test",
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Lint",
      "type": "shell",
      "command": "npm run lint",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Train NeRF Model",
      "type": "shell",
      "command": "python",
      "args": ["python/scripts/train_model.py"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    }
  ]
}
EOF
fi

# Setup environment variables
echo "🌍 Setting up environment variables..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "📝 Created .env file from .env.example"
fi

# Test installations
echo "🧪 Testing installations..."
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Python version: $(python --version)"
echo "TypeScript version: $(npx tsc --version)"

# Test WebGPU support (mock)
echo "🎮 Checking WebGPU support..."
node -e "console.log('WebGPU mock support: OK')" || echo "⚠️  WebGPU test failed"

# Test Python imports
echo "🐍 Testing Python imports..."
python -c "import torch; print(f'PyTorch version: {torch.__version__}')" || echo "⚠️  PyTorch import failed"
python -c "import numpy; print(f'NumPy version: {numpy.__version__}')" || echo "⚠️  NumPy import failed"

# Show final status
echo ""
echo "✅ NeRF Edge Kit development environment setup complete!"
echo ""
echo "🎯 Quick start commands:"
echo "  npm run dev      - Start development server"
echo "  npm test         - Run tests"
echo "  npm run build    - Build for production"
echo "  jupyter lab      - Start Jupyter Lab"
echo ""
echo "📚 Useful paths:"
echo "  Source code:     ./src/"
echo "  Python scripts:  ./python/"
echo "  Tests:           ./tests/"
echo "  Documentation:   ./docs/"
echo "  Cache:           ./.cache/"
echo ""
echo "Happy coding! 🚀"