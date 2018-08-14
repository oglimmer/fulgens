


const BufferedBuilder = require('./BufferedBuilder');

class WaitBuilder extends BufferedBuilder {

  build() {
    return `\n\n#####${this.constructor.name}\n\n` + `
# waiting for ctrl-c
if [ "$TAIL" == "YES" ]; then
  $tailCmd
else
  echo "$tailCmd"
  echo "<return> to rebuild, ctrl-c to stop CouchDB and Tomcat"
  while true; do
    read </dev/tty
    mvn package
    #TODO: cp $artifact $targetPath
  done
fi
    `;
  }

}

module.exports = new WaitBuilder();





