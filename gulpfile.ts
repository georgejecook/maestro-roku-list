import { series } from "gulp";
import { RooibosProcessor, createProcessorConfig } from 'rooibos-cli';
import { BurpConfig, BurpProcessor } from "burp-brightscript";
import { ProgramBuilder } from 'brighterscript';

const gulp = require('gulp');
const gulpClean = require('gulp-clean');
const outDir = './build';
const rokuDeploy = require('roku-deploy');

let args = {
  host: process.env.ROKU_HOST || '192.168.16.3',
  username: process.env.ROKU_USER || 'rokudev',
  password: process.env.ROKU_PASSWORD || 'aaaa',
  rootDir: './build',
  files: ['**/*'],
  outDir: './out',
  retainStagingFolder: true
};

export function clean() {
  console.log('Doing a clean at ' + outDir);
  return gulp.src(['out', outDir], { allowEmpty: true }).pipe(gulpClean({ force: true }));
}

export function createDirectories() {
  return gulp.src('*.*', { read: false })
    .pipe(gulp.dest('./build'))
    .pipe(gulp.dest('./out'));
}

export async function deploy(cb) {
  await rokuDeploy.publish(args);
}

async function compile(cb) {
  let builder = new ProgramBuilder();
  await builder.run({
    stagingFolderPath: outDir,
    createPackage: false
  });
}

async function prepareTests(cb) {

  let testFiles = [];

  if (process.env.TEST_FILES_PATTERN) {
    console.log('using overridden test files');
    testFiles = JSON.parse(process.env.TEST_FILES_PATTERN);
  } else {
    testFiles = [
      '**/tests/**/*.brs',
      '!**/rooibosDist.brs',
      '!**/rooibosFunctionMap.brs',
      '!**/TestsScene.brs'
    ];
  }

  const isCodeCoverageBuild = false;

  let config = createProcessorConfig({
    projectPath: outDir,
    sourceFilePattern: [
      '**/*.brs',
      '**/*.xml',
      '!**/tests/**/*.*',
      '!**/tests',
      '!**/rLog',
      '!**/rLog/**/*.*',
      '!**/rLogComponents',
      '!**/rLogComponents/**/*.*',
      '!**/rooibosDist.brs',
      '!**/rooibosFunctionMap.brs',
      '!**/TestsScene.brs',
      '!**/ThreadUtils.brs'
    ],
    showFailuresOnly: true,
    testsFilePattern: testFiles,
    isRecordingCodeCoverage: isCodeCoverageBuild
  });
  let processor = new RooibosProcessor(config);
  processor.processFiles();

  cb();
}
export function applyBurpPreprocessing(cb) {
  const currentPath = process.cwd();
  let replacements = null;
  if (process.env.buildType === 'prod') {
    replacements = [{
      regex: '(^\\s*(m\\.)*(registerLogger)\\((\\s*"))',
      replacement: '\'$1'
    },
    {
      regex: '(^\\s*(m\\.)*(logMethod|logInfo|logError|logVerbose|logDebug|logWarn)\\()',
      replacement: '\'$1'
    },

    ];
  } else {
    replacements = [
      {
        regex: '(^\\s*(m\\.)*(logInfo|logError|logVerbose|logDebug|logWarn|logMethod)\\((\\s*"))',
        replacement: '$1#FullPath# '
      }
    ];
  }

  // add crash resilience to tests
  if (process.env.buildType === 'test') {
    replacements.push({
      regex: '(^(\\s*)m\\.assert)',
      replacement: '  if not m.currentResult.isFail then $1'
    });
  }
  let config: BurpConfig = {
    sourcePath: outDir,
    globPattern: '**/*.brs',
    replacements: replacements
  };

  const processor = new BurpProcessor(config);
  processor.processFiles();
  console.log(`Resetting path to ${currentPath}`);
  process.chdir(currentPath);
  cb();
}


exports.build = series(clean, createDirectories, compile, applyBurpPreprocessing);
exports.prePublish = series(exports.build)
exports.prePublishTests = series(exports.build, prepareTests);
