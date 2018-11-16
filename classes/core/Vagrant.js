
const nunjucks = require('nunjucks');

const optionsBuilder = require('../phase/options');
const prepareBuilder = require('../phase/prepare');

const DependencyManager = require('../core/dependencyManager');

var build = () => {};

class Vagrant {
	
	static prepare(userConfig, runtimeConfig) {
		const { BuildDependencies, Vagrant, UseHomeM2 } = userConfig.config;

		const dependencyManager = new DependencyManager();
		if (BuildDependencies) {
			dependencyManager.addAptBuild(BuildDependencies.Apt);
			dependencyManager.addNpmBuild(BuildDependencies.Npm);
		}
		if (Vagrant.Install) {
			dependencyManager.addAptBuild(Vagrant.Install.split(' '));
		}

		optionsBuilder.add('v', '', 'VAGRANT', 'start VirtualBox via vagrant, install all dependencies, ssh into the VM and run');
		build = () => {
			// must be deferred as it uses runtimeConfig.accessUrl
			prepareBuilder.add(nunjucks.render('classes/core/Vagrant.tmpl', {
				Vagrant,
				dependencyManager,
				UseHomeM2,
				accessUrl: runtimeConfig.accessUrl
			}));
		};
	}

	static build() {
		build();
	}

}

module.exports = Vagrant;
