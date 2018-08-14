
const cleanupTail = `
    fi
  done

  exit 0
}
`;

class CleanupBuilder {

  constructor() {
    this.componentsCode = [];
  }

  init(userConfig) {
  }

  add(componentName, sourceTypes) {
    this.componentsCode.push({
      componentName,
      sourceTypes
    });
  }

  build() {
    const cleanupHead = `
cleanup()
{
  echo "****************************************************************"
  echo "Stopping software .....please wait...."
  echo "****************************************************************"

  ALL_COMPONENTS=(${this.componentsCode.map(e => e.componentName.toLowerCase()).join(' ')})
  for keepRunningAllElement in "\${ALL_COMPONENTS[@]}"; do
    IFS=',' read -r -a array <<< "$KEEP_RUNNING"
    found=0
    for keepRunningToFindeElement in "\${array[@]}"; do
      if [ "$keepRunningAllElement" == "$keepRunningToFindeElement" ]; then
        echo "Not stopping $keepRunningAllElement!"
        found=1
      fi
    done
    if [ "$found" -eq 0 ]; then
`;

    const middle = this.componentsCode.map(e => `
      if [ "$keepRunningAllElement" == "${e.componentName.toLowerCase()}" ]; then
        echo "Stopping $keepRunningAllElement ..."
        `
        + e.sourceTypes.map(a => `if [ "$TYPE_SOURCE_${e.componentName.toUpperCase()}" == "${a.name}" ]; then
         ${a.stopCode}
         rm -f .${e.componentName.toLowerCase()}
        fi
        `).join('') + `
      fi`
    ).join('');
    return `\n\n#####${this.constructor.name}\n\n` + cleanupHead + middle + cleanupTail;
  }

}

module.exports = new CleanupBuilder();
