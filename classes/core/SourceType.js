
const globalVariables = require('../phase/globalvariables');
const prepare = require('../phase/prepare');


const start = `
IFS=',' read -r -a array <<< "$TYPE_SOURCE"
for typeSourceElement in "\${array[@]}"; do
  IFS=: read comp type pathOrVersion <<< "$typeSourceElement"`;

const end = `
done
`;

class SourceTypeBuilder {

  add( componentName, defaultType, availableTypes, code) {
    // availableTypes : array of { typeName, defaultVersion, code }

    const componentNameUpper = componentName.toUpperCase();
    const componentNameLower = componentName.toLowerCase();

    globalVariables.add(`TYPE_SOURCE_${componentNameUpper}`, defaultType);

    const middle = `
  if [ "$comp" == "${componentNameLower}" ]; then
    TYPE_SOURCE_${componentNameUpper}=$type
    if [ "$TYPE_SOURCE_${componentNameUpper}" == "local" ]; then
      TYPE_SOURCE_${componentNameUpper}_PATH=$pathOrVersion
    else
      TYPE_SOURCE_${componentNameUpper}_VERSION=$pathOrVersion
    fi
  fi
`;

    prepare.add(start + middle + end + availableTypes.filter(e => e.defaultVersion).map(e => `
if [ "$TYPE_SOURCE_${componentNameUpper}" == "${e.typeName}" ]; then
  if [ -z "$TYPE_SOURCE_${componentNameUpper}_VERSION" ]; then
    TYPE_SOURCE_${componentNameUpper}_VERSION=${e.defaultVersion}
  fi
  ` + (e.code ? e.code : '') + `
fi`).join('\n'));
  }

}

module.exports = new SourceTypeBuilder();