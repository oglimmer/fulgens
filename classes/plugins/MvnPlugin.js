
const nunjucks = require('nunjucks');

const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');

const BasePlugin = require('./BasePlugin');

const dependencyManager = require('../core/DependencyManager');

const DEFAULT_DOCKER_VERSION = '3-jdk-11';

class MvnPlugin extends BasePlugin {

  static instance() {
    return new MvnPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);
    
    const { DockerImage = 'maven' } = userConfig.software[softwareComponentName];

    dependencycheckBuilder.add('mvn --version 1>/dev/null');

    optionsBuilder.add('b', 'local|docker:version', 'BUILD',
      `build locally (default) or within a maven image on docker, the default image is ${DEFAULT_DOCKER_VERSION}`,
      [ `docker:[3-jdk-8|3-jdk-9|3-jdk-10|3-jdk-11] #do a docker based build, uses ${DockerImage}:${DEFAULT_DOCKER_VERSION} image`,
        'local #do a local build, would respect -j']);

    const { Mvn, BeforeBuild = [], AfterBuild = [], EnvVars = [] } = userConfig.software[softwareComponentName];
    const Goal = Mvn && Mvn.Goal ? Mvn.Goal.replace('$$TMP$$', 'localrun') : 'package';
    const GoalIgnoreClean = Mvn && Mvn.GoalIgnoreClean ? true : false;

    if (Mvn && Mvn.BuildDependencies) {
      const bd = Mvn.BuildDependencies;
      dependencyManager.addAptBuild(bd.Apt);
      dependencyManager.addNpmBuild(bd.Npm);
    }

    const rpl = obj => (Array.isArray(obj)?obj:[obj]).map(e => e.replace('$$TMP$$', 'localrun')).join('\n');

    this.build = () => nunjucks.render('classes/plugins/MvnPlugin.tmpl', {
      ...this.nunjucksObj(),
      GoalIgnoreClean: GoalIgnoreClean ? '' : '$MVN_CLEAN',
      Goal,
      DEFAULT_DOCKER_VERSION,
      DockerImage,
      dependencyManager,
      BeforeBuild: rpl(BeforeBuild),
      AfterBuild: rpl(AfterBuild),
      AllEnvVarsDocker: EnvVars.map(p => `-e ${p}`).join(' '),
      AllEnvVarsShell: EnvVars.map(p => `export ${p}`).join('\n'),
    });
  }

}

module.exports = MvnPlugin;
