
const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');

const BasePlugin = require('./BasePlugin');

const dependencyManager = require('../core/DependencyManager');

const DEFAULT_DOCKER_VERSION = '3-jdk-10';

const start = (Goal, BeforeBuild, AfterBuild) => `
if [ "$BUILD" == "local" ]; then
  f_build() {
    ${BeforeBuild}
    mvn $MVN_CLEAN $MVN_OPTS ${Goal}
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

const buildCode = (Goal, BeforeBuild = '', AfterBuild = '') => {
  if (dependencyManager.hasAnyBuildDep()) {
    return start(Goal, BeforeBuild, AfterBuild) + `
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
  f_build() {
    ${BeforeBuild}
    docker run --rm -v "$(pwd)":/usr/src/build -v "$(pwd)/localrun/.m2":/root/.m2 -w /usr/src/build maven_build:$dockerVersion mvn $MVN_CLEAN $MVN_OPTS ${Goal}
    ${AfterBuild}
  }
    ` + end;
  } else {
    return start(Goal, BeforeBuild, AfterBuild) + `
  f_build() {
    ${BeforeBuild}
    docker run --rm -v "$(pwd)":/usr/src/build -v "$(pwd)/localrun/.m2":/root/.m2 -w /usr/src/build maven:$dockerVersion mvn $MVN_CLEAN $MVN_OPTS ${Goal}
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
    // Should provide:
    // const artifact = userConfig.software[softwareComponentName].Artifact;

    dependencycheckBuilder.add('mvn --version 1>/dev/null');

    optionsBuilder.add('b', 'local|docker:version', 'BUILD',
      `build locally (default) or within a maven image on docker, the default image is ${DEFAULT_DOCKER_VERSION}`,
      [ 'docker:[3-jdk-8|3-jdk-9|3-jdk-10] #do a docker based build, uses \\`maven:3-jdk-10\\` image',
        'local #do a local build, would respect -j']);

    const { Mvn, BeforeBuild, AfterBuild, Git, Param } = userConfig.software[softwareComponentName];
    const Goal = Mvn && Mvn.Goal ? Mvn.Goal.replace('$$TMP$$', 'localrun') : 'package';
    const Dir = Mvn && Mvn.Dir ? Mvn.Dir : null;

    if (Param) {
      optionsBuilder.add(Param.char, '', Param.var, Param.desc);
      this.preparecompBuilder.add(`if [ "$${Param.var}" == "YES" ]; then`);
    }

    if (Git) {
      this.getsourceBuilder.add(`
        if [ ! -d ".git" ]; then
          git clone "${Git}" .
        else
          git pull
        fi
      `);
    }

    if (Dir) {
      this.preparecompBuilder.add(`  mkdir -p ${Dir.replace('$$TMP$$', 'localrun')}`);
      if (Git) {
        this.preparecompBuilder.add(`
  OPWD=$(pwd)
  cd ${Dir.replace('$$TMP$$', 'localrun')}
        `);
        this.leavecompBuilder.add('  cd $OPWD');
      }
    }

    if (Mvn && Mvn.BuildDependencies) {
      const bd = Mvn.BuildDependencies;
      dependencyManager.addAptBuild(bd.apt);
      dependencyManager.addNpmBuild(bd.npm);
    }

    this.buildBuilder.add(buildCode(Goal, BeforeBuild, AfterBuild));

    if (Param) {
      // this must be the last addition to leavecompBuilder
      this.leavecompBuilder.add('fi');
    }
  }

}

module.exports = MvnPlugin;

