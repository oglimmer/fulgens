
const headBuilder = require('../phase/head');
const functionsBuilder = require('../phase/functions');
const buildBuilder = require('../phase/build');
const dependencycheckBuilder = require('../phase/dependencycheck');
const getsourceBuilder = require('../phase/getsource');
const postbuildBuilder = require('../phase/postbuild');
const prebuildBuilder = require('../phase/prebuild');
const BasePlugin = require('./BasePlugin');

const dependencyManager = require('../core/DependencyManager');

const start = `
#build
if [ "$SKIP_BUILD" != "YES" ]; then
  if [ -n "$CLEAN" ]; then
    MVN_CLEAN=clean
  fi
  if [ "$BUILD" == "local" ]; then
    mvn $MVN_CLEAN $MVN_OPTS package
  elif [[ "$BUILD" == docker* ]]; then
    IFS=: read mainType dockerVersion <<< "$BUILD"
    if [ -z "$dockerVersion" ]; then
      dockerVersion=3-jdk-10
    fi
`;

const end = `
  fi
fi   
`;

const buildCode = Goal => {
  if (dependencyManager.hasAnyBuildDep()) {
    return start + `
    mkdir -p localrun/dockerbuild
    cat <<-EOFDOCK > localrun/dockerbuild/Dockerfile
FROM maven:$dockerVersion
RUN apt-get update && \\` + dependencyManager.getAptBuild() + ` && \\
    apt-get clean && \\
    rm -rf /tmp/* /var/tmp/* /var/lib/apt/archive/* /var/lib/apt/lists/*
RUN ` + dependencyManager.getNpmBuild() + `
ENTRYPOINT ["/usr/local/bin/mvn-entrypoint.sh"]
CMD ["mvn"]
EOFDOCK
    docker build --tag maven_build:$dockerVersion localrun/dockerbuild/

    docker run --rm -v "$(pwd)":/usr/src/build -v "$(pwd)/localrun/.m2":/root/.m2 -w /usr/src/build maven_build:$dockerVersion mvn $MVN_CLEAN $MVN_OPTS ${Goal}
    ` + end;
  } else {
    return start + `
    docker run --rm -v "$(pwd)":/usr/src/build -v "$(pwd)/localrun/.m2":/root/.m2 -w /usr/src/build maven:$dockerVersion mvn $MVN_CLEAN $MVN_OPTS ${Goal}
    ` + end;
  }
}

class MvnPlugin extends BasePlugin {

  static instance() {
    return new MvnPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    // Should provide:
    // const artifact = userConfig.software[softwareComponentName].Artifact;

    dependencycheckBuilder.add('mvn --version 1>/dev/null');

    const { Mvn, BeforeBuild, AfterBuild, Git } = userConfig.software[softwareComponentName];
    const Goal = Mvn && Mvn.Goal ? Mvn.Goal : "package";

    if (Mvn && Mvn.BuildDependencies) {
      const bd = Mvn.BuildDependencies;
      dependencyManager.addAptBuild(bd.apt);
      dependencyManager.addNpmBuild(bd.npm);
    }

    if (BeforeBuild) {
      prebuildBuilder.add(BeforeBuild);
    }
    buildBuilder.add(buildCode(Goal));
    if (AfterBuild) {
      postbuildBuilder.add(AfterBuild);
    }

  }

}

module.exports = MvnPlugin;

