
const nunjucks = require('nunjucks');

const dependencycheckBuilder = require('../phase/dependencycheck');
const optionsBuilder = require('../phase/options');
const sourceTypeBuilder = require('../core/SourceType');
const { maxVersion } = require('../core/Strings');

const BasePlugin = require('./BasePlugin');

const DependencyManager = require('../core/DependencyManager');

class MvnPlugin extends BasePlugin {

  static instance() {
    return new MvnPlugin();
  }

  exec(softwareComponentName, userConfig, runtimeConfiguration) {
    super.exec(softwareComponentName, userConfig, runtimeConfiguration);
    
    const { JavaVersions, UseHomeM2 } = userConfig.config;
    const { DockerImage = 'maven' } = userConfig.software[softwareComponentName];

    var defaultDockerVersion = maxVersion(JavaVersions);

    dependencycheckBuilder.add('mvn --version 1>/dev/null');

    optionsBuilder.addDetails(softwareComponentName, 'local', [
      `${softwareComponentName}:local #build local and respect -j`,
      `${softwareComponentName}:docker:[TAG] #docker based build, default tag: ${defaultDockerVersion}, uses image http://hub.docker.com/_/${DockerImage}`
    ]);

    sourceTypeBuilder.add(this, {
      componentName: softwareComponentName,
      defaultType: 'local', 
      availableTypes: [
        { typeName: 'local', defaultVersion: '' },
        { typeName: 'docker', defaultVersion: defaultDockerVersion }
      ]
    });

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
    const typeSourceVarName = `TYPE_SOURCE_${softwareComponentName.toUpperCase()}`;

    const rpl = obj => (Array.isArray(obj)?obj:[obj]).map(e => e.replace('$$TMP$$', 'localrun')).join('\n');

    this.build = () => nunjucks.render('classes/plugins/MvnPlugin.tmpl', {
      ...this.nunjucksObj(),
      GoalIgnoreClean: GoalIgnoreClean ? '' : '$MVN_CLEAN',
      softwareComponentName,
      typeSourceVarName,
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
