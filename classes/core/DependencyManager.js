
function hasNode(set) {
  return set.has('nodejs') || set.has('npm') || set.has('node');
}
function fixAptPackagesForOlderOS(set, debianVersion) {
  const clone = new Set(set.values());
  // phantomjs not available on Debian 8.x
  if (debianVersion.match(/^8/)) {
    clone.delete('phantomjs');
  }
  // install nodejs instead on npm on Debian 8.x and 9.x
  //if (debianVersion.match(/^8/) || debianVersion.match(/^9/)) {
  //  replace 'npm' by 'nodejs'
  //}
  return clone;
}

/**
 * Manages dependencies for NPM and APT. Older versions of Debian/Ubuntu don't have Node or NPM in
 * their default repository. Also binaries like phantomjs are not available on Debian 8.11
 *
 * Currently handles: Node/npm and phantomjs
 */
class DependencyManager {

  addAptDependenciesForNpm(npmName) {
    if (npmName === 'jasmine') {
      this.aptPackages.add('nodejs');
      // This seems like a bug, but jamsine doesn't work without this
      this.envVars.add("OPENSSL_CONF=/etc/ssl/");            
    }
  }

  constructor() {
    this.aptPackages = new Set();
    this.npmPackages = new Set();
    this.envVars = new Set();
  }

  addAptBuild(packageNames) {
    if (!packageNames) {
      return;
    }
    if (!Array.isArray(packageNames)) {
      packageNames = [packageNames];
    }
    packageNames.forEach(aptName => {
      aptName = aptName.toLowerCase();
      if (aptName === 'npm' || aptName === 'node') {
        throw "Do not use npm or node as an apt dependency. Use nodejs instead."
      }
      this.aptPackages.add(aptName);
    });
  }
  
  addNpmBuild(packageNames) {
    if (!packageNames) {
      return;
    }
    if (!Array.isArray(packageNames)) {
      packageNames = [packageNames];
    }
    packageNames.forEach(npmName => {
      npmName = npmName.toLowerCase();
      this.npmPackages.add(npmName);
      this.addAptDependenciesForNpm(npmName);
    });
  }

  getEnvVars() {
    return [...this.envVars.values()];
  }

  /*
   * Returns shell code to install the apt packages specified via config.BuildDependencies.Apt
   * This will contain shell code to install packages, pre-requisits and config
   */
  getAptBuild() {
    if (this.aptPackages.size == 0) {
      return ';';
    }
    // aptDebian8 contains all packages supposed to be install on Debian 8.x
    // bufferDebian8 contains shell code to install Debian 8.x packages, pre-requisits and config
    const aptDebian8 = fixAptPackagesForOlderOS(this.aptPackages, '8');
    var bufferDebian8 = ';';
    if (aptDebian8.size > 0) {
      bufferDebian8 = hasNode(aptDebian8) ? 'curl -sL https://deb.nodesource.com/setup_6.x | bash -;' : '';
      bufferDebian8 += ` apt-get -qy install ${[...aptDebian8.values()].join(' ')};`
    }
    // aptDebian9 contains all packages supposed to be install on Debian 9.x
    // bufferDebian9 contains shell code to install Debian 9.x packages, pre-requisits and config
    const aptDebian9 = fixAptPackagesForOlderOS(this.aptPackages, '9');
    var bufferDebian9 = ';';
    if (aptDebian9.size > 0) {
      bufferDebian9 = hasNode(aptDebian9) ? 'curl -sL https://deb.nodesource.com/setup_6.x | bash -;' : '';
      bufferDebian9 += ` apt-get -qy install ${[...aptDebian9.values()].join(' ')};`;
    }
    // this.aptPackages contains all packages supposed to be install on Debian X
    // bufferDebianAll contains shell code to install Debian X packages, pre-requisits and config
    var bufferDebianAll = '';
    bufferDebianAll = hasNode(this.aptPackages) ? 'curl -sL https://deb.nodesource.com/setup_10.x | bash -;' : '';
    bufferDebianAll += ` apt-get -qy install ${[...this.aptPackages.values()].join(' ')};`;
    // this.aptPackages contains all packages supposed to be install on Ubuntu X
    // bufferUbuntuAll contains shell code to install Ubuntu X packages, pre-requisits and config
    var bufferUbuntuAll = '';
    bufferUbuntuAll = hasNode(this.aptPackages) ? 'curl -sL https://deb.nodesource.com/setup_10.x | bash -;' : '';
    bufferUbuntuAll += ` apt-get -qy install ${[...this.aptPackages.values()].join(' ')};`;
    // the return code must run on bare sh (inside Dockerfile or vagrant-init)
    return `
      if [ "\\$(cat /etc/*release|grep ^ID=)" = "ID=debian"  ]; then \\\\
        if [ "\\$(cat /etc/debian_version)" = "8.11" ]; then \\\\
           ${bufferDebian8} \\\\
        elif [ "\\$(cat /etc/debian_version)" = "9.5" ]; then \\\\
          ${bufferDebian9} \\\\
        else ${bufferDebianAll} fi \\\\
      elif [ "\\$(cat /etc/*release|grep ^ID=)" = "ID=ubuntu"  ]; then \\\\
        ${bufferUbuntuAll} \\\\
      else \\\\
        echo "only debian or ubuntu are supported."; \\\\
        exit 1; \\\\
      fi \\\\
    `;
  }

  /*
   * Returns shell code to install the apt packages specified via config.BuildDependencies.Apt
   */
  getNpmBuild(preFix = '') {
    if (this.npmPackages.size == 0) {
      return '';
    }
    return preFix + 'npm install -g ' + [...this.npmPackages.values()].join(' ');
  }

  hasAnyBuildDep() {
    return this.aptPackages.size > 0 || this.npmPackages.size > 0;
  }

}

module.exports = DependencyManager;
