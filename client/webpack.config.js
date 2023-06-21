const path = require('path');

module.exports = {
  // The entry point file described above
  entry: {
    app: './src/app.js',
    "player-page": './src/player-page.js',
  },
  // The location of the build folder described above
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: (pathData) => {
      return '[name].bundle.js';
    },
  },
  // Optional and for development only. This provides the ability to
  // map the built code back to the original source format when debugging.
  devtool: 'source-map', // 'eval-source-map',
  mode : 'development',
};
