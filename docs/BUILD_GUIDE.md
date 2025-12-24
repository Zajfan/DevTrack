# DevTrack Build & Setup Guide

## Quick Start

### 1. Backend Setup (C++23 Server)

#### Prerequisites
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install build-essential cmake libsqlite3-dev git

# Fedora/RHEL
sudo dnf install gcc-c++ cmake sqlite-devel git

# macOS
brew install cmake sqlite3

# Windows (with vcpkg)
vcpkg install sqlite3:x64-windows
```

#### Build Backend
```bash
cd backend

# Create build directory
mkdir -p build && cd build

# Configure with CMake
cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_STANDARD=23

# Build
cmake --build . --config Release -j$(nproc)

# Run tests (optional)
ctest --output-on-failure

# The binary will be at: build/bin/devtrack_server
```

#### Running the Backend Server
```bash
cd build/bin
./devtrack_server --port=3001 --db=~/.devtrack/devtrack.db
```

### 2. Frontend Setup (Electron + React)

#### Prerequisites
```bash
# Install Node.js 18+ (via nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or using system package manager
# Ubuntu/Debian
sudo apt-get install nodejs npm

# macOS
brew install node
```

#### Install Dependencies & Run
```bash
cd frontend

# Install dependencies
npm install
# or with pnpm (faster)
npm install -g pnpm
pnpm install

# Development mode (with hot reload)
npm run electron:dev

# Build for production
npm run electron:build

# The packaged app will be in frontend/release/
```

## Development Workflow

### Backend Development

1. **Make Changes** to C++ files in `backend/src/` or `backend/include/`

2. **Rebuild**:
   ```bash
   cd backend/build
   cmake --build . --config Release
   ```

3. **Test**:
   ```bash
   cd backend/build
   ctest --verbose
   ```

4. **Debug Build**:
   ```bash
   cmake .. -DCMAKE_BUILD_TYPE=Debug
   cmake --build .
   gdb ./bin/devtrack_server
   ```

### Frontend Development

1. **Run Development Server**:
   ```bash
   cd frontend
   npm run electron:dev
   ```
   - Changes to React files auto-reload
   - DevTools open by default
   - Backend must be running separately or will auto-start

2. **Code Formatting**:
   ```bash
   npm run format
   ```

3. **Linting**:
   ```bash
   npm run lint
   ```

## Project Configuration

### Backend Configuration

Create `backend/config.json`:
```json
{
  "server": {
    "port": 3001,
    "host": "localhost",
    "cors": true
  },
  "database": {
    "path": "~/.devtrack/devtrack.db",
    "auto_backup": true,
    "backup_interval_hours": 24
  },
  "logging": {
    "level": "info",
    "file": "~/.devtrack/logs/devtrack.log"
  }
}
```

### Frontend Configuration

Edit `frontend/src/main/main.ts` to customize:
- Backend port
- Window size
- Auto-start behavior

## Building for Distribution

### Linux
```bash
cd frontend
npm run electron:build

# Output: frontend/release/DevTrack-1.0.0.AppImage
# or:     frontend/release/devtrack_1.0.0_amd64.deb
```

### Windows
```bash
cd frontend
npm run electron:build

# Output: frontend/release/DevTrack Setup 1.0.0.exe
```

### macOS
```bash
cd frontend
npm run electron:build

# Output: frontend/release/DevTrack-1.0.0.dmg
```

## Troubleshooting

### Backend Issues

**Issue**: CMake can't find SQLite3
```bash
# Ubuntu/Debian
sudo apt-get install libsqlite3-dev

# macOS
brew install sqlite3
export PKG_CONFIG_PATH="/usr/local/opt/sqlite/lib/pkgconfig"

# Windows
vcpkg install sqlite3:x64-windows
```

**Issue**: C++23 not supported
- Update compiler to GCC 12+, Clang 16+, or MSVC 2022+
- Check with: `g++ --version` or `clang++ --version`

**Issue**: Server won't start
```bash
# Check if port is in use
lsof -i :3001  # Unix/macOS
netstat -ano | findstr :3001  # Windows

# Check logs
tail -f ~/.devtrack/logs/devtrack.log
```

### Frontend Issues

**Issue**: Electron won't start
```bash
# Clear cache
rm -rf node_modules
npm install

# Reset Electron
npm install electron --force
```

**Issue**: Can't connect to backend
- Ensure backend is running on port 3001
- Check `frontend/src/renderer/services/api.ts` for correct URL
- Verify firewall settings

**Issue**: Build fails
```bash
# Clean and rebuild
rm -rf dist release
npm run build
```

## Advanced Configuration

### Using Different Databases

The backend supports custom database paths:
```bash
./devtrack_server --db=/path/to/custom.db
```

### Custom Port Configuration

Backend:
```bash
./devtrack_server --port=8080
```

Frontend: Update `frontend/src/main/main.ts`:
```typescript
const BACKEND_PORT = 8080;
```

### Development vs Production

The app automatically detects the environment:
- **Development**: Uses `http://localhost:5173` for Vite dev server
- **Production**: Uses bundled `index.html`

## Performance Optimization

### Backend
- Use Release build: `-DCMAKE_BUILD_TYPE=Release`
- Enable optimizations: `-DCMAKE_CXX_FLAGS="-O3 -march=native"`
- Profile with `perf` or `valgrind`

### Frontend
- Lazy loading for routes
- Code splitting with Vite
- Minimize bundle size:
  ```bash
  npm run build -- --mode production
  ```

## Database Migrations

If you need to migrate data from the old C# version:

1. Export from C# SQLite database
2. Use the migration script (TODO: create migration script)
3. Import into new database

## Continuous Integration

Example GitHub Actions workflow:

```yaml
name: Build DevTrack

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: sudo apt-get install cmake libsqlite3-dev
      - name: Build
        run: |
          cd backend
          mkdir build && cd build
          cmake .. -DCMAKE_BUILD_TYPE=Release
          cmake --build .
      - name: Test
        run: cd backend/build && ctest

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install and build
        run: |
          cd frontend
          npm install
          npm run build
```

## Next Steps

1. ✅ Backend structure created
2. ✅ Frontend structure created
3. ⏳ Implement remaining API endpoints
4. ⏳ Create React components
5. ⏳ Add WebSocket support
6. ⏳ Implement concept mapping
7. ⏳ Add tests
8. ⏳ Create installer packages

## Resources

- [CMake Documentation](https://cmake.org/documentation/)
- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev)
- [Material-UI Documentation](https://mui.com)
- [C++23 Features](https://en.cppreference.com/w/cpp/23)

---

For more information, see the main [README_NEW.md](../README_NEW.md)
