const path = require('path');
const sdkPkg = require('../tuikit-atomic-x/package.json');

module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: false,
    },
  },
  dependencies: {
    [sdkPkg.name]: {
      root: path.join(__dirname, '../tuikit-atomic-x'),
      platforms: {
        ios: {},
        android: {},
      },
    },
  },
};
