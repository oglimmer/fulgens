
const BufferedBuilder = require('./BufferedBuilder');

class CleanBuilder extends BufferedBuilder {

  buildInternal() {
    return `
# clean if requested
if [ -n "$CLEAN" ]; then
  if [ "$CLEAN" == "all" ]; then
  	if [ "$VERBOSE" == "YES" ]; then echo "rm -rf localrun"; fi
    rm -rf localrun
  fi
  ${super.buildInternal()}
fi
`;
  }

}

module.exports = new CleanBuilder();
