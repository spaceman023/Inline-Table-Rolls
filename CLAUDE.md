# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Inline Table Rolls is a Foundry Virtual Tabletop module that enables rolling and drawing results from tables within chat messages. The module uses regex parsing to find inline table references in chat messages and replaces them with rolled results.

## Architecture

### Core Components

- **Main Script**: `scripts/inline-tables.js` - Single JavaScript file containing all module functionality
- **Module Manifest**: `module.json` - Foundry VTT module configuration
- **Documentation**: `readme.md` - User-facing documentation with syntax examples

### Key Functions

- `parseInlineTables()` - Entry point that processes chat messages containing table references
- `handleMatches()` - Recursive function that processes all table references with built-in loop protection (max depth: 10)
- `getResults()` - Handles individual table rolls and result formatting
- `findTable()` - Searches for tables in world data and compendium packs
- `formatResult()` - Formats multiple results based on user settings

### Syntax Pattern

The module recognizes table references using the pattern: `^^#TableName^^`
- Multiple rolls: `^^#?1d4?TableName^^` or `^^#?5?TableName^^`
- Uses double carats (`^^`) to avoid conflicts with Foundry's built-in roll parsing

### Foundry VTT Integration

- Uses Foundry's Hook system: `createChatMessage` hook triggers parsing
- Integrates with Foundry's settings system for user configuration
- Searches both world tables (`game.tables`) and compendium packs (`game.packs`)
- Uses Foundry's `Roll` class for dice expressions in multiple roll syntax
- Updates chat messages in-place using `tableChatMessage.update()`

### Settings

- No user settings are currently available

## Development Notes

- No build process required - direct JavaScript module for Foundry VTT
- No package.json or npm dependencies
- Compatible with Foundry VTT v12-v13 (uses version detection for backward compatibility)
- Module follows Foundry's standard module structure and API patterns