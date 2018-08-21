

var head = `#!/usr/bin/env bash

trap cleanup 2
set -e
`;

class HeadBuilder {

  init(userConfig) {
  }

  build() {
    return head;
  }

}

module.exports = new HeadBuilder();
