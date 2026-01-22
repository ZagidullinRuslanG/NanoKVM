#!/bin/bash
# Assemble result_build package from built artifacts
# Usage: ./scripts/assemble_build.sh [--zip]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_ROOT/result_build"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check required files exist
check_artifacts() {
    local missing=0

    if [ ! -f "$PROJECT_ROOT/server/NanoKVM-Server" ]; then
        log_error "server/NanoKVM-Server not found. Run 'make app' first."
        missing=1
    fi

    if [ ! -d "$PROJECT_ROOT/web/dist" ]; then
        log_error "web/dist not found. Run 'cd web && pnpm build' first."
        missing=1
    fi

    if [ $missing -eq 1 ]; then
        exit 1
    fi
}

# Create directory structure
create_structure() {
    log_info "Creating result_build directory structure..."
    rm -rf "$OUTPUT_DIR"
    mkdir -p "$OUTPUT_DIR/server/dl_lib"
    mkdir -p "$OUTPUT_DIR/web"
    mkdir -p "$OUTPUT_DIR/hdmi"
}

# Copy artifacts
copy_artifacts() {
    log_info "Copying server binary..."
    cp "$PROJECT_ROOT/server/NanoKVM-Server" "$OUTPUT_DIR/server/"

    log_info "Copying web frontend..."
    cp -r "$PROJECT_ROOT/web/dist/"* "$OUTPUT_DIR/web/"

    # Copy libkvm.so if exists
    if [ -f "$PROJECT_ROOT/kvmapp/kvm_system/dl_lib/libkvm.so" ]; then
        log_info "Copying libkvm.so..."
        cp "$PROJECT_ROOT/kvmapp/kvm_system/dl_lib/libkvm.so" "$OUTPUT_DIR/server/dl_lib/"
    elif [ -f "$PROJECT_ROOT/server/dl_lib/libkvm.so" ]; then
        log_info "Copying libkvm.so from server/dl_lib..."
        cp "$PROJECT_ROOT/server/dl_lib/libkvm.so" "$OUTPUT_DIR/server/dl_lib/"
    else
        log_warn "libkvm.so not found. You may need to run 'make support' or copy it manually."
    fi

    # Copy init scripts
    log_info "Copying init scripts..."
    cp "$PROJECT_ROOT/kvmapp/system/init.d/S03usbdev" "$OUTPUT_DIR/"
    cp "$PROJECT_ROOT/kvmapp/system/init.d/S03usbhid" "$OUTPUT_DIR/"

    # Copy HDMI tools if exist
    if [ -f "$PROJECT_ROOT/support/sg2002/build/nanokvm_update_edid" ]; then
        log_info "Copying HDMI tools..."
        cp "$PROJECT_ROOT/support/sg2002/build/nanokvm_update_edid" "$OUTPUT_DIR/hdmi/"
    fi
}

# Create README
create_readme() {
    log_info "Creating README..."
    cat > "$OUTPUT_DIR/README.md" << 'EOF'
# NanoKVM Build Package

## Contents

- `server/NanoKVM-Server` - Backend server (RISC-V binary)
- `server/dl_lib/libkvm.so` - Hardware support library
- `web/` - Frontend static files
- `S03usbdev`, `S03usbhid` - USB init scripts
- `hdmi/` - HDMI utilities (if available)

## Deployment

### Copy to device:
```bash
scp -r server/* root@<device-ip>:/kvmapp/server/
scp -r web root@<device-ip>:/kvmapp/server/
scp S03usb* root@<device-ip>:/etc/init.d/
```

### Restart service:
```bash
ssh root@<device-ip> "/etc/init.d/S95nanokvm restart"
```
EOF
}

# Create ZIP archive
create_zip() {
    log_info "Creating ZIP archive..."
    cd "$OUTPUT_DIR"
    zip -r "$PROJECT_ROOT/result_build.zip" .
    cd "$PROJECT_ROOT"
    log_info "Created: result_build.zip"
}

# Main
main() {
    log_info "Assembling result_build package..."

    check_artifacts
    create_structure
    copy_artifacts
    create_readme

    if [ "$1" = "--zip" ]; then
        create_zip
    fi

    log_info "Done! Output: $OUTPUT_DIR"
    echo ""
    log_info "Contents:"
    find "$OUTPUT_DIR" -type f | head -20
}

main "$@"
