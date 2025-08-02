#!/bin/bash

# Fail if anything errors
set -eox pipefail

if [[ "$EAS_BUILD_RUNNER" != "eas-build" ]]; then
  echo "Skip Ruby installation on a local build."
  exit 0
fi

if [[ "$EAS_BUILD_PLATFORM" != "ios" ]]; then
  echo "Skip Ruby installation on Linux Android workers."
  exit 0
fi

export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1
export PATH=/opt/homebrew/bin:$PATH

echo "Installing Ruby..."
brew install ruby
echo "Configuring the bundler..."
gem install bundler:2.4.12
bundle config --global set path.system true
echo "Configure Node..."
sudo ln -s $(which node) /usr/local/bin/node
echo "Done."
