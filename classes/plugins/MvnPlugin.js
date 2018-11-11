
const nunjucks = require('nunjucks');

const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');

const BasePlugin = require('./BasePlugin');

const DependencyManager = require('../core/DependencyManager');

function maxVersion(versionsArray) {
  // find the greatest java version: string-to-float, sort, get last number
  const numberArray = versionsArray.map(e => parseFloat(e));
  numberArray.sort();
  const lastVal = numberArray[numberArray.length - 1];
  // java versions are 1.6, 1.7, 1.8, 9, 10, 11, but we need 6, 7, 8, 9, 10, 11
  if (lastVal < 2) {
    return (lastVal - 1) * 10;
  }
  return lastVal;
}

class MvnPlugin extends BasePlugin {

  static instance() {
    return new MvnPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);
    
    const { JavaVersions, UseHomeM2 } = userConfig.config;
    const { DockerImage = 'maven' } = userConfig.software[softwareComponentName];

    var defaultDockerVersion = JavaVersions ? `3-jdk-${maxVersion(JavaVersions)}` : '3-jdk-11';

    dependencycheckBuilder.add('mvn --version 1>/dev/null');

    optionsBuilder.add('b', 'local|docker:version', 'BUILD',
      `build locally (default) or within a maven image on docker, the default image is ${defaultDockerVersion}`,
      [ `docker:[3-jdk-8|3-jdk-9|3-jdk-10|3-jdk-11] #do a docker based build, uses ${DockerImage}:${defaultDockerVersion} image`,
        'local #do a local build, would respect -j']);

    const { BuildDependencies } = userConfig.config;

    const dependencyManager = new DependencyManager();
    if (BuildDependencies) {
      dependencyManager.addAptBuild(BuildDependencies.Apt);
      dependencyManager.addNpmBuild(BuildDependencies.Npm);
    }

    const { Mvn, BeforeBuild = [], AfterBuild = [], EnvVars = [] } = userConfig.software[softwareComponentName];
    const Goal = Mvn && Mvn.Goal ? Mvn.Goal.replace('$$TMP$$', 'localrun') : 'package';
    const GoalIgnoreClean = Mvn && Mvn.GoalIgnoreClean ? true : false;
    const AllEnvVars = [...EnvVars, ...dependencyManager.getEnvVars()];

    const rpl = obj => (Array.isArray(obj)?obj:[obj]).map(e => e.replace('$$TMP$$', 'localrun')).join('\n');

    this.build = () => nunjucks.render('classes/plugins/MvnPlugin.tmpl', {
      ...this.nunjucksObj(),
      GoalIgnoreClean: GoalIgnoreClean ? '' : '$MVN_CLEAN',
      Goal,
      defaultDockerVersion,
      DockerImage,
      dependencyManager,
      m2Mapping: UseHomeM2 ? '"$HOME/.m2"' : '"$(pwd)/localrun/.m2"',
      BeforeBuild: rpl(BeforeBuild),
      AfterBuild: rpl(AfterBuild),
      AllEnvVarsDocker: AllEnvVars.map(l => l.replace('$$TMP$$', 'localrun')).map(p => `-e ${p}`).join(' '),
      AllEnvVarsShell: AllEnvVars.map(l => l.replace('$$TMP$$', 'localrun')).map(p => `export ${p}`).join('\n'),
    });
  }

}

module.exports = MvnPlugin;
