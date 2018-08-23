
const BufferedBuilder = require('./BufferedBuilder');
const cleanupBuilder = require('./cleanup');

class WaitBuilder extends BufferedBuilder {

  buildInternal() {
    return `
# waiting for ctrl-c
if [ "$TAIL" == "YES" ]; then
  $tailCmd
else
  echo "$tailCmd"
  echo "<return> to rebuild, ctrl-c to stop ${cleanupBuilder.componentsCode.map(e => e.componentName).join(', ')}"
  while true; do
    read </dev/tty
    f_build
    f_deploy
  done
fi
    `;
  }

}

module.exports = new WaitBuilder();





