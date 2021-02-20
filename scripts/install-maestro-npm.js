/**
 * Installs a local version of all the rokucommunity dependent packages into this project
 */

import * as fsExtra from 'fs-extra';
import * as path from 'path';
import * as childProcess from 'child_process';
import * as rimraf from 'rimraf';

//set the cwd to the root of this project
let thisProjectRootPath = path.join(__dirname, '..');
process.chdir(thisProjectRootPath);
let packageJson = JSON.parse(fsExtra.readFileSync('package.json').toString());

let packages = {
  'mc': 'npm:maestro-roku-core@^0.3.8',
  'mioc': 'npm:maestro-roku-ioc@^0.3.4',
  'log': 'npm:roku-log@^0.3.1',
  'mv': 'npm:maestro-roku-view@^0.2.14'
};

for (let packageName in packages) {
  console.log(`adding '${packageName}' to package.json`);
  packageJson.dependencies[packageName] = `${packages[packageName]}`;
  rimraf.sync(path.join('node_modules', packageName));
}

console.log('saving package.json changes');
fsExtra.writeFileSync('package.json', JSON.stringify(packageJson, null, 4));
fsExtra.rmSync('package-lock.json');
console.log('ropm install');
childProcess.execSync('ropm install', {
  stdio: 'inherit'
});
