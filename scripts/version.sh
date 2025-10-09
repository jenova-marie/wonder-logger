#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   RecoverySky Server - Version Bump${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "Current version: ${GREEN}${CURRENT_VERSION}${NC}"
echo ""

# Parse version
IFS='.' read -r -a VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR="${VERSION_PARTS[0]}"
MINOR="${VERSION_PARTS[1]}"
PATCH="${VERSION_PARTS[2]}"

# Calculate new versions
NEXT_PATCH="$MAJOR.$MINOR.$((PATCH + 1))"
NEXT_MINOR="$MAJOR.$((MINOR + 1)).0"
NEXT_MAJOR="$((MAJOR + 1)).0.0"

echo "Select version bump type:"
echo "  1) Patch  (${CURRENT_VERSION} → ${NEXT_PATCH}) - Bug fixes"
echo "  2) Minor  (${CURRENT_VERSION} → ${NEXT_MINOR}) - New features (backward compatible)"
echo "  3) Major  (${CURRENT_VERSION} → ${NEXT_MAJOR}) - Breaking changes"
echo "  4) Custom version"
echo ""
read -p "Enter choice (1-4): " -n 1 -r CHOICE
echo ""

case $CHOICE in
  1)
    NEW_VERSION="$NEXT_PATCH"
    ;;
  2)
    NEW_VERSION="$NEXT_MINOR"
    ;;
  3)
    NEW_VERSION="$NEXT_MAJOR"
    ;;
  4)
    read -p "Enter custom version: " NEW_VERSION
    ;;
  *)
    echo -e "${RED}❌ Invalid choice${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "New version: ${GREEN}${NEW_VERSION}${NC}"
echo ""
read -p "Confirm version bump? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}❌ Version bump cancelled${NC}"
  exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Version bump cancelled${NC}"
    exit 1
  fi
fi

# Update package.json
echo "Updating package.json..."
npm version "$NEW_VERSION" --no-git-tag-version
echo -e "${GREEN}✓${NC} Updated package.json to ${NEW_VERSION}"

# Commit version bump
echo ""
read -p "Commit version bump? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git add package.json
  git commit -m "Bump version to ${NEW_VERSION}"
  echo -e "${GREEN}✓${NC} Committed version bump"

  read -p "Push to remote? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push
    echo -e "${GREEN}✓${NC} Pushed to remote"
  fi
fi

echo ""
echo -e "${GREEN}✓${NC} Version bump complete: ${CURRENT_VERSION} → ${NEW_VERSION}"
echo ""
echo "Next steps:"
echo "  1. Run tests: pnpm test"
echo "  2. Build package: pnpm build"
echo "  3. Publish: pnpm publish:npm"
echo ""
