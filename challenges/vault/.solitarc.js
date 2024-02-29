const path = require('path');
const programDir = path.join(__dirname, 'programs', 'vault');
const idlDir = path.join(__dirname, "target", 'idl');
const sdkDir = path.join(__dirname, 'src', 'generated');
const binaryInstallDir = path.join(__dirname, '.crates');

module.exports = {
  idlGenerator: 'anchor',
  programName: 'vault',
  programId: '7Qc3nfhGh6tJgRJMVjDcek83SD4pLnCr5vbYC4Rn7Sxs',
  idlDir,
  sdkDir,
  binaryInstallDir,
  programDir,
  removeExistingIdl: false,
  anchorRemainingAccounts: false,
};