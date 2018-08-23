
const BaseBuilder = require('./BaseBuilder');

var head = `#!/usr/bin/env bash

trap cleanup 2
set -e
`;

class HeadBuilder extends BaseBuilder {

  build() {
    return head;
  }

}

module.exports = new HeadBuilder();
