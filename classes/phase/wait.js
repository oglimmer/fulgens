


const BufferedBuilder = require('./BufferedBuilder');

class WaitBuilder extends BufferedBuilder {

  build() {
    return `
# waiting for ctrl-c
if [ "$TAIL" == "YES" ]; then
  $tailCmd
else
  echo "$tailCmd"
  echo "<return> to rebuild, ctrl-c to stop CouchDB and Tomcat"
  while true; do
    read </dev/tty
    mvn package
    cp web/target/grid.war $targetPath
  done
fi
    `;
  }

}

module.exports = new WaitBuilder();





