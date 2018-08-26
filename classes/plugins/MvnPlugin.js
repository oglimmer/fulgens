
const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');

const BasePlugin = require('./BasePlugin');

const dependencyManager = require('../core/DependencyManager');

const DEFAULT_DOCKER_VERSION = '3-jdk-10';

const start = (Goal, GoalIgnoreClean, BeforeBuild, AfterBuild) => `
if [ "$BUILD" == "local" ]; then
  f_build() {
    if [ -n "$VERBOSE" ]; then echo "pwd=$(pwd)"; echo "mvn ${GoalIgnoreClean?'':'$MVN_CLEAN'} $MVN_OPTS ${Goal}"; fi
    ${BeforeBuild}
    mvn ${GoalIgnoreClean?'':'$MVN_CLEAN'} $MVN_OPTS ${Goal}
    ${AfterBuild}
  }
elif [[ "$BUILD" == docker* ]]; then
  IFS=: read mainType dockerVersion <<< "$BUILD"
  if [ -z "$dockerVersion" ]; then
    dockerVersion=${DEFAULT_DOCKER_VERSION}
  fi
`;

const end = `
fi   
if [ "$SKIP_BUILD" != "YES" ]; then
  if [ -n "$CLEAN" ]; then
    MVN_CLEAN=clean
  fi
  f_build
fi
`;

const buildCode = (Goal, GoalIgnoreClean, BeforeBuild = '', AfterBuild = '') => {
  if (dependencyManager.hasAnyBuildDep()) {
    return start(Goal, GoalIgnoreClean, BeforeBuild, AfterBuild) + `
  mkdir -p localrun/dockerbuild
  cat <<-EOFDOCK > localrun/dockerbuild/Dockerfile
FROM maven:$dockerVersion
RUN apt-get update && \\\\` + dependencyManager.getAptBuild() + ` && \\\\
  apt-get clean && \\\\
  rm -rf /tmp/* /var/tmp/* /var/lib/apt/archive/* /var/lib/apt/lists/*
RUN ` + dependencyManager.getNpmBuild() + `
ENTRYPOINT ["/usr/local/bin/mvn-entrypoint.sh"]
CMD ["mvn"]
EOFDOCK
  docker build --tag maven_build:$dockerVersion localrun/dockerbuild/
  f_build() {
    if [ -n "$VERBOSE" ]; then echo "pwd=$(pwd)"; echo "docker run --rm -v $(pwd):/usr/src/build -v $(pwd)/localrun/.m2:/root/.m2 -w /usr/src/build maven_build:$dockerVersion mvn ${GoalIgnoreClean?'':'$MVN_CLEAN'} $MVN_OPTS ${Goal}"; fi
    ${BeforeBuild}
    docker run --rm -v "$(pwd)":/usr/src/build -v "$(pwd)/localrun/.m2":/root/.m2 -w /usr/src/build maven_build:$dockerVersion mvn ${GoalIgnoreClean?'':'$MVN_CLEAN'} $MVN_OPTS ${Goal}
    ${AfterBuild}
  }
    ` + end;
  } else {
    return start(Goal, GoalIgnoreClean, BeforeBuild, AfterBuild) + `
  f_build() {
    if [ -n "$VERBOSE" ]; then echo "pwd=$(pwd)"; echo "docker run --rm -v $(pwd):/usr/src/build -v $(pwd)/localrun/.m2:/root/.m2 -w /usr/src/build maven:$dockerVersion mvn ${GoalIgnoreClean?'':'$MVN_CLEAN'} $MVN_OPTS ${Goal}"; fi
    ${BeforeBuild}
    docker run --rm -v "$(pwd)":/usr/src/build -v "$(pwd)/localrun/.m2":/root/.m2 -w /usr/src/build maven:$dockerVersion mvn ${GoalIgnoreClean?'':'$MVN_CLEAN'} $MVN_OPTS ${Goal}
    ${AfterBuild}
  }
    ` + end;
  }
}

class MvnPlugin extends BasePlugin {

  static instance() {
    return new MvnPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);
    // May provide:
    // const artifact = userConfig.software[softwareComponentName].Artifact;

    dependencycheckBuilder.add('mvn --version 1>/dev/null');

    optionsBuilder.add('b', 'local|docker:version', 'BUILD',
      `build locally (default) or within a maven image on docker, the default image is ${DEFAULT_DOCKER_VERSION}`,
      [ 'docker:[3-jdk-8|3-jdk-9|3-jdk-10] #do a docker based build, uses \\`maven:3-jdk-10\\` image',
        'local #do a local build, would respect -j']);

    const { Mvn, BeforeBuild, AfterBuild } = userConfig.software[softwareComponentName];
    const Goal = Mvn && Mvn.Goal ? Mvn.Goal.replace('$$TMP$$', 'localrun') : 'package';
    const GoalIgnoreClean = Mvn && Mvn.GoalIgnoreClean ? true : false;

    if (Mvn && Mvn.BuildDependencies) {
      const bd = Mvn.BuildDependencies;
      dependencyManager.addAptBuild(bd.Apt);
      dependencyManager.addNpmBuild(bd.Npm);
    }

    this.buildBuilder.add(buildCode(Goal, GoalIgnoreClean, BeforeBuild, AfterBuild));
  }

}

module.exports = MvnPlugin;

