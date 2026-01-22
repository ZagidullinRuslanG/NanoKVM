# Build Guide / Инструкция по сборке

This guide explains how to build NanoKVM from source and create `result_build` package for deployment.

## Prerequisites / Требования

- **Docker** (Docker Desktop for macOS/Windows or Docker Engine for Linux)
- **Node.js** 18+ with **pnpm** (`npm install -g pnpm`)
- **Git**
- At least 10GB free disk space (for Docker image)

## Quick Build / Быстрая сборка

```bash
# 1. Clone repository
git clone https://github.com/ZagidullinRuslanG/NanoKVM.git
cd NanoKVM

# 2. Build everything
make all          # Build server + support libraries
cd web && pnpm install && pnpm build && cd ..

# 3. Assemble result_build
./scripts/assemble_build.sh   # See below for manual steps
```

## Step-by-Step Build / Пошаговая сборка

### Step 1: Build Docker Image

First time only - creates cross-compilation environment for RISC-V:

```bash
make builder-image
```

This builds a Docker image with:
- Go compiler (cross-compile for RISC-V)
- RISC-V GCC toolchain (riscv64-unknown-linux-musl-gcc)
- MaixCDK SDK for hardware libraries

**Verify image:**
```bash
make check-image
```

### Step 2: Build Go Server (Backend)

```bash
make app
```

Output: `server/NanoKVM-Server` (RISC-V binary, ~20MB)

### Step 3: Build Hardware Support Libraries

```bash
make support
```

Output: `kvmapp/kvm_system/dl_lib/libkvm.so`

### Step 4: Build Web Frontend

```bash
cd web
pnpm install
pnpm build
cd ..
```

Output: `web/dist/` directory with static files

### Step 5: Assemble result_build

Create the deployment package manually:

```bash
# Create directory structure
mkdir -p result_build/server/dl_lib
mkdir -p result_build/web
mkdir -p result_build/hdmi

# Copy server binary
cp server/NanoKVM-Server result_build/server/

# Copy C library
cp kvmapp/kvm_system/dl_lib/libkvm.so result_build/server/dl_lib/

# Copy web frontend
cp -r web/dist/* result_build/web/

# Copy init scripts (if modified)
cp kvmapp/system/init.d/S03usbdev result_build/
cp kvmapp/system/init.d/S03usbhid result_build/

# Copy HDMI tools (if available)
# cp support/sg2002/build/nanokvm_update_edid result_build/hdmi/
```

### Step 6: Create ZIP Archive (Optional)

```bash
cd result_build
zip -r ../result_build.zip .
cd ..
```

## result_build Structure / Структура result_build

```
result_build/
├── server/
│   ├── NanoKVM-Server        # Go backend (RISC-V binary)
│   └── dl_lib/
│       └── libkvm.so         # Hardware support library
├── web/                      # Frontend static files
│   ├── assets/
│   ├── index.html
│   └── ...
├── hdmi/                     # HDMI utilities (optional)
│   ├── nanokvm_update_edid
│   └── edid_*.bin
├── S03usbdev                 # USB device init script
└── S03usbhid                 # USB HID init script
```

## Deployment to Device / Деплой на устройство

### Via SCP

```bash
# Copy files to device
scp -r result_build/server/* root@<device-ip>:/kvmapp/server/
scp -r result_build/web root@<device-ip>:/kvmapp/server/
scp result_build/S03usb* root@<device-ip>:/etc/init.d/

# Restart service
ssh root@<device-ip> "/etc/init.d/S95nanokvm restart"
```

### Via Web Update

1. Create ZIP: `zip -r update.zip result_build/*`
2. Upload through NanoKVM web interface: Settings → System → Update

## Troubleshooting / Решение проблем

### Docker build fails on Apple Silicon (M1/M2/M3)

The Dockerfile uses `--platform=linux/amd64` for Rosetta emulation. If builds fail:

```bash
# Enable Rosetta in Docker Desktop settings
# Or rebuild with explicit platform:
docker build --platform linux/amd64 -t nanokvm-builder -f docker/Dockerfile ./
```

### "make: docker: Permission denied"

```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker
```

### Go module download fails

```bash
# Enter Docker shell and download manually
make shell
cd /home/build/NanoKVM/server
go mod tidy
go mod download
```

### pnpm not found

```bash
npm install -g pnpm
# Or use corepack (Node.js 16+)
corepack enable
corepack prepare pnpm@latest --activate
```

## Development Commands / Команды разработки

```bash
make help         # Show all available commands
make shell        # Enter Docker build environment
make clean        # Remove build artifacts

# Frontend development
cd web
pnpm dev          # Start dev server (localhost:3001)
pnpm lint         # Run ESLint
pnpm build        # Production build
```

## CI/CD Notes

For automated builds, all steps can be run non-interactively:

```bash
# Remove -it flags for CI
docker run --rm -v $(pwd):/home/build/NanoKVM nanokvm-builder /bin/bash -c "cd /home/build/NanoKVM/server && go build"
```
