# App Icons

This directory contains the application icons for the Tauri build.

## Required Files

- `32x32.png` - Small icon (32x32 pixels)
- `128x128.png` - Medium icon (128x128 pixels)
- `128x128@2x.png` - Retina medium icon (256x256 pixels)
- `icon.icns` - macOS app icon bundle
- `icon.png` - Base icon (512x512 or 1024x1024 pixels)

## Generating Icons

You can generate all required sizes from a single high-resolution PNG using tools like:

- [tauri-icon](https://github.com/nicklasad/tauri-icon): `npx tauri-icon icon.png`
- [iconutil](https://developer.apple.com/library/archive/documentation/GraphicsAnimation/Conceptual/HighResolutionOSX/Optimizing/Optimizing.html) (macOS built-in)

## Notes

- Source icon should be at least 1024x1024 pixels
- Use PNG format with transparency support
- The `.icns` file is required for macOS builds
