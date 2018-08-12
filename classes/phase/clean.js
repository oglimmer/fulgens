
const BufferedBuilder = require('./BufferedBuilder');

class CleanBuilder extends BufferedBuilder {

  build() {
    return `
# clean if requested
if [ -n "$CLEAN" ]; then
  if [ "$CLEAN" == "all" ]; then
    rm -rf localrun
  fi
  ${super.build()}
fi
`;
  }

}

module.exports = new CleanBuilder();
